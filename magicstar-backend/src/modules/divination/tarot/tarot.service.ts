import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { TarotCard } from './entities/tarot-card.entity'
import { TarotSpread } from './entities/tarot-spread.entity'
import { DivinationRecord } from './entities/divination-record.entity'
import { CreateDivinationDto, SpreadType } from './dto/create-divination.dto'
import { DivinationHistoryQueryDto } from './dto/divination-history-query.dto'
import { ShareResultDto, SharePlatform } from './dto/share-result.dto'
import { TarotAlgorithmService } from './tarot-algorithm.service'

@Injectable()
export class TarotService {
  constructor(
    @InjectRepository(TarotCard)
    private readonly tarotCardRepository: Repository<TarotCard>,
    @InjectRepository(TarotSpread)
    private readonly tarotSpreadRepository: Repository<TarotSpread>,
    @InjectRepository(DivinationRecord)
    private readonly divinationRecordRepository: Repository<DivinationRecord>,
    private readonly algorithmService: TarotAlgorithmService
  ) {}

  /**
   * 获取所有牌阵列表
   */
  async getSpreads() {
    const spreads = await this.tarotSpreadRepository.find({
      where: { active: true },
      order: { sortOrder: 'ASC' }
    })

    return spreads.map(spread => ({
      id: spread.id,
      type: spread.type,
      name: spread.name,
      description: spread.description,
      cardCount: spread.cardCount,
      difficulty: spread.difficultyLevel,
      positions: spread.positions
    }))
  }

  /**
   * 获取所有塔罗牌卡片
   */
  async getCards() {
    const cards = await this.tarotCardRepository.find({
      where: { active: true },
      order: { id: 'ASC' }
    })

    return cards.map(card => ({
      id: card.id,
      name: card.name,
      nameEn: card.nameEn,
      suit: card.suit,
      number: card.number,
      type: card.type,
      keywords: card.keywords,
      keywordsReversed: card.keywordsReversed,
      imageUrl: card.imageUrl,
      description: card.description
    }))
  }

  /**
   * 执行塔罗牌占卜
   */
  async performDivination(userId: string, createDivinationDto: CreateDivinationDto) {
    const { question, spreadType, selectedCardIds, timestamp } = createDivinationDto

    // 获取牌阵信息
    const spread = await this.tarotSpreadRepository.findOne({
      where: { type: spreadType, active: true }
    })

    if (!spread) {
      throw new HttpException(
        {
          code: 400,
          message: '牌阵类型不存在或已禁用'
        },
        HttpStatus.BAD_REQUEST
      )
    }

    // 获取所有可用卡片
    const allCards = await this.tarotCardRepository.find({
      where: { active: true }
    })

    if (allCards.length < spread.cardCount) {
      throw new HttpException(
        {
          code: 500,
          message: '可用卡片数量不足'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }

    // 选择卡片（如果没有指定则随机选择）
    let selectedCards: TarotCard[]
    if (selectedCardIds && selectedCardIds.length === spread.cardCount) {
      selectedCards = await this.tarotCardRepository.findByIds(selectedCardIds)
      if (selectedCards.length !== spread.cardCount) {
        throw new HttpException(
          {
            code: 400,
            message: '指定的卡片ID无效'
          },
          HttpStatus.BAD_REQUEST
        )
      }
    } else {
      selectedCards = this.algorithmService.selectRandomCards(allCards, spread.cardCount)
    }

    // 生成卡片位置和正逆位
    const cardResults = this.algorithmService.generateCardResults(
      selectedCards,
      spread.positions
    )

    // 生成占卜解读
    const interpretation = await this.algorithmService.generateInterpretation(
      question,
      spreadType,
      cardResults
    )

    // 保存占卜记录
    const divinationRecord = this.divinationRecordRepository.create({
      userId: parseInt(userId),
      question,
      spreadType,
      spreadId: spread.id,
      cardIds: cardResults.map(card => card.id),
      cardResults,
      interpretation,
      divinationTime: timestamp ? new Date(timestamp) : new Date()
    })

    const savedRecord = await this.divinationRecordRepository.save(divinationRecord)

    return {
      id: savedRecord.id,
      question: savedRecord.question,
      spreadType: savedRecord.spreadType,
      spreadName: savedRecord.spread?.name || 'Unknown',
      cards: savedRecord.cardResults,
      interpretation: savedRecord.interpretation,
      summary: savedRecord.interpretation?.summary,
      createdAt: savedRecord.createdAt
    }
  }

  /**
   * 获取用户占卜历史记录
   */
  async getDivinationHistory(userId: string, query: DivinationHistoryQueryDto) {
    const {
      page = 1,
      limit = 10,
      spreadType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query

    const queryBuilder = this.divinationRecordRepository
      .createQueryBuilder('record')
      .where('record.userId = :userId', { userId })

    // 牌阵类型筛选
    if (spreadType) {
      queryBuilder.andWhere('record.spreadType = :spreadType', { spreadType })
    }

    // 日期范围筛选
    if (startDate && endDate) {
      queryBuilder.andWhere('record.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      })
    } else if (startDate) {
      queryBuilder.andWhere('record.createdAt >= :startDate', {
        startDate: new Date(startDate)
      })
    } else if (endDate) {
      queryBuilder.andWhere('record.createdAt <= :endDate', {
        endDate: new Date(endDate)
      })
    }

    // 排序
    queryBuilder.orderBy(`record.${sortBy}`, sortOrder)

    // 分页
    const skip = (page - 1) * limit
    queryBuilder.skip(skip).take(limit)

    const [records, total] = await queryBuilder.getManyAndCount()

    return {
      records: records.map(record => ({
        id: record.id,
        question: record.question,
        spreadType: record.spreadType,
        spreadName: record.spread?.name || 'Unknown',
        cards: record.cardResults,
        summary: record.interpretation?.summary,
        createdAt: record.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * 获取占卜记录详情
   */
  async getDivinationDetail(userId: string, recordId: string) {
    const record = await this.divinationRecordRepository.findOne({
      where: { id: parseInt(recordId), userId: parseInt(userId) }
    })

    if (!record) {
      return null
    }

    return {
      id: record.id,
      question: record.question,
      spreadType: record.spreadType,
      spreadName: record.spread?.name || 'Unknown',
      cards: record.cardResults,
      interpretation: record.interpretation,
      summary: record.interpretation?.summary,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }
  }

  /**
   * 分享占卜结果
   */
  async shareResult(userId: string, shareResultDto: ShareResultDto) {
    const { divinationId, platform, customMessage, includeCardImages, includeInterpretation } = shareResultDto

    // 验证占卜记录是否存在且属于当前用户
    const record = await this.divinationRecordRepository.findOne({
      where: { id: parseInt(divinationId), userId: parseInt(userId) }
    })

    if (!record) {
      throw new HttpException(
        {
          code: 404,
          message: '占卜记录不存在'
        },
        HttpStatus.NOT_FOUND
      )
    }

    // 生成分享内容
    const shareContent = this.generateShareContent(
      record,
      platform,
      customMessage,
      includeCardImages,
      includeInterpretation
    )

    // 生成分享链接
    const shareUrl = this.generateShareUrl(divinationId, platform)

    return {
      shareUrl,
      shareContent,
      platform,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    }
  }

  /**
   * 删除占卜记录
   */
  async deleteDivinationRecord(userId: string, recordId: string) {
    const record = await this.divinationRecordRepository.findOne({
      where: { id: parseInt(recordId), userId: parseInt(userId) }
    })

    if (!record) {
      throw new HttpException(
        {
          code: 404,
          message: '占卜记录不存在'
        },
        HttpStatus.NOT_FOUND
      )
    }

    await this.divinationRecordRepository.remove(record)
  }

  /**
   * 生成分享内容
   */
  private generateShareContent(
    record: DivinationRecord,
    platform: SharePlatform,
    customMessage?: string,
    includeCardImages = true,
    includeInterpretation = false
  ): string {
    let content = customMessage || '我刚刚进行了一次塔罗牌占卜，想和你分享结果！'
    
    content += `\n\n📮 问题：${record.question}`
    content += `\n🔮 牌阵：${record.spread?.name || 'Unknown'}`
    
    if (record.cardResults && record.cardResults.length > 0) {
      content += '\n\n🃏 抽到的牌：'
      record.cardResults.forEach((card: any, index: number) => {
        content += `\n${index + 1}. ${card.name}${card.reversed ? ' (逆位)' : ''} - ${card.position}`
      })
    }
    
    if (includeInterpretation && record.interpretation?.summary) {
      content += `\n\n✨ 解读：${record.interpretation.summary}`
    }
    
    content += '\n\n🌟 来Magic Star体验更多占卜功能吧！'
    
    return content
  }

  /**
   * 生成分享链接
   */
  private generateShareUrl(divinationId: string, platform: SharePlatform): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://magicstar.app'
    const shareUrl = `${baseUrl}/share/tarot/${divinationId}`
    
    switch (platform) {
      case SharePlatform.WECHAT:
        return shareUrl
      case SharePlatform.WEIBO:
        return `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}`
      case SharePlatform.QQ:
        return `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}`
      default:
        return shareUrl
    }
  }
}