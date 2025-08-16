import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { TarotCard } from '../entities/tarot-card.entity';
import { TarotSpread } from '../entities/tarot-spread.entity';
import { TarotReading } from '../entities/tarot-reading.entity';
import { TarotEngineService } from './tarot-engine.service';
import { CreateTarotReadingDto, TarotReadingResultDto } from '../dto/create-tarot-reading.dto';
import { QueryTarotCardsDto, QueryTarotSpreadsDto, QueryTarotReadingsDto } from '../dto/query-tarot.dto';
import { PrometheusService } from '../../monitoring/services/prometheus.service';
import { Cache, CacheEvict } from '../../../common/decorators/cache.decorator';

/**
 * 塔罗牌服务
 */
@Injectable()
export class TarotService {
  constructor(
    @InjectRepository(TarotCard)
    private readonly tarotCardRepository: Repository<TarotCard>,
    @InjectRepository(TarotSpread)
    private readonly tarotSpreadRepository: Repository<TarotSpread>,
    @InjectRepository(TarotReading)
    private readonly tarotReadingRepository: Repository<TarotReading>,
    private readonly tarotEngineService: TarotEngineService,
    private readonly prometheusService: PrometheusService,
  ) {}

  /**
   * 获取所有塔罗牌
   */
  @Cache({ key: 'tarot_cards', ttl: 600, tags: ['tarot', 'cards'] })
  async getAllCards(queryDto: QueryTarotCardsDto): Promise<{
    cards: TarotCard[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { type, suit, keyword, page = 1, limit = 20 } = queryDto;
    const queryBuilder = this.tarotCardRepository.createQueryBuilder('card');

    // 按类型筛选
    if (type) {
      queryBuilder.andWhere('card.type = :type', { type });
    }

    // 按花色筛选
    if (suit) {
      queryBuilder.andWhere('card.suit = :suit', { suit });
    }

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(card.nameCn LIKE :keyword OR card.nameEn LIKE :keyword OR card.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序
    queryBuilder.orderBy('card.type', 'ASC')
      .addOrderBy('card.cardNumber', 'ASC');

    // 分页
    const total = await queryBuilder.getCount();
    const cards = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { cards, total, page, limit };
  }

  /**
   * 根据ID获取塔罗牌
   */
  async getCardById(id: number): Promise<TarotCard> {
    const card = await this.tarotCardRepository.findOne({ where: { id } });
    if (!card) {
      throw new NotFoundException('塔罗牌不存在');
    }
    return card;
  }

  /**
   * 获取所有牌阵
   */
  @Cache({ key: 'tarot_spreads', ttl: 600, tags: ['tarot', 'spreads'] })
  async getAllSpreads(queryDto: QueryTarotSpreadsDto): Promise<{
    spreads: TarotSpread[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { difficulty, minCards, maxCards, keyword, page = 1, limit = 10 } = queryDto;
    const queryBuilder = this.tarotSpreadRepository.createQueryBuilder('spread')
      .where('spread.isActive = :isActive', { isActive: true });

    // 按难度筛选
    if (difficulty) {
      queryBuilder.andWhere('spread.difficulty = :difficulty', { difficulty });
    }

    // 按牌数范围筛选
    if (minCards !== undefined) {
      queryBuilder.andWhere('spread.cardCount >= :minCards', { minCards });
    }
    if (maxCards !== undefined) {
      queryBuilder.andWhere('spread.cardCount <= :maxCards', { maxCards });
    }

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(spread.nameCn LIKE :keyword OR spread.nameEn LIKE :keyword OR spread.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序
    queryBuilder.orderBy('spread.sortOrder', 'ASC')
      .addOrderBy('spread.usageCount', 'DESC');

    // 分页
    const total = await queryBuilder.getCount();
    const spreads = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { spreads, total, page, limit };
  }

  /**
   * 根据ID获取牌阵
   */
  async getSpreadById(id: number): Promise<TarotSpread> {
    const spread = await this.tarotSpreadRepository.findOne({
      where: { id, isActive: true },
    });
    if (!spread) {
      throw new NotFoundException('牌阵不存在或已禁用');
    }
    return spread;
  }

  /**
   * 进行塔罗占卜
   */
  async performReading(userId: number, createDto: CreateTarotReadingDto): Promise<TarotReadingResultDto> {
    const { spreadId, question } = createDto;

    try {
      // 验证牌阵
      const isValidSpread = await this.tarotEngineService.validateSpread(spreadId);
      if (!isValidSpread) {
        // 记录失败的占卜请求指标
        this.prometheusService.recordDivinationRequest('tarot', 'error');
        throw new BadRequestException('无效的牌阵');
      }

    // 抽牌
    const { spread, drawnCards } = await this.tarotEngineService.drawCardsForSpread(spreadId);

    // 生成解读
    const interpretation = this.tarotEngineService.generateInterpretation(
      drawnCards,
      spread,
      question,
    );

    // 保存占卜记录
    const reading = this.tarotReadingRepository.create({
      userId,
      spreadId,
      question,
      drawnCards: drawnCards.map(dc => ({
        position: dc.position,
        cardId: dc.cardId,
        isReversed: dc.isReversed,
      })),
      overallInterpretation: interpretation.overallInterpretation,
      detailedInterpretation: interpretation.detailedInterpretation,
      summary: interpretation.summary,
      advice: interpretation.advice,
    });

    const savedReading = await this.tarotReadingRepository.save(reading);

    // 更新牌阵使用次数
    await this.tarotSpreadRepository.increment(
      { id: spreadId },
      'usageCount',
      1,
    );

      // 记录成功的占卜请求指标
      this.prometheusService.recordDivinationRequest('tarot', 'success');

      // 返回结果
      return {
        id: savedReading.id,
        spread: {
          id: spread.id,
          nameCn: spread.nameCn,
          name: spread.name,
          cardCount: spread.cardCount,
        },
        question: savedReading.question,
        drawnCards: drawnCards.map(dc => ({
          position: dc.position,
          cardId: dc.card.id,
          isReversed: dc.isReversed,
          cardName: dc.card.name,
          cardNameCn: dc.card.nameCn,
          meaning: dc.isReversed ? dc.card.reversedMeaning : dc.card.uprightMeaning,
          imageUrl: dc.card.imageUrl,
        })),
        overallInterpretation: interpretation.overallInterpretation,
        detailedInterpretation: interpretation.detailedInterpretation,
        summary: interpretation.summary,
        advice: interpretation.advice,
        readingTime: savedReading.createdAt,
      };
    } catch (error) {
      // 记录失败的占卜请求指标（如果还没有记录的话）
      if (!(error instanceof BadRequestException)) {
        this.prometheusService.recordDivinationRequest('tarot', 'error');
      }
      throw error;
    }
  }

  /**
   * 获取用户的占卜历史
   */
  async getUserReadings(userId: number, queryDto: QueryTarotReadingsDto): Promise<{
    readings: TarotReading[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { spreadId, startDate, endDate, page = 1, limit = 10 } = queryDto;
    const queryBuilder = this.tarotReadingRepository.createQueryBuilder('reading')
      .leftJoinAndSelect('reading.spread', 'spread')
      .where('reading.userId = :userId', { userId });

    // 按牌阵筛选
    if (spreadId) {
      queryBuilder.andWhere('reading.spreadId = :spreadId', { spreadId });
    }

    // 按日期范围筛选
    if (startDate && endDate) {
      queryBuilder.andWhere('reading.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('reading.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('reading.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    // 排序
    queryBuilder.orderBy('reading.createdAt', 'DESC');

    // 分页
    const total = await queryBuilder.getCount();
    const readings = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { readings, total, page, limit };
  }

  /**
   * 根据ID获取占卜记录
   */
  async getReadingById(id: number, userId?: number): Promise<TarotReading> {
    const queryBuilder = this.tarotReadingRepository.createQueryBuilder('reading')
      .leftJoinAndSelect('reading.spread', 'spread')
      .where('reading.id = :id', { id });

    if (userId) {
      queryBuilder.andWhere('reading.userId = :userId', { userId });
    } else {
      queryBuilder.andWhere('reading.isPublic = :isPublic', { isPublic: true });
    }

    const reading = await queryBuilder.getOne();
    if (!reading) {
      throw new NotFoundException('占卜记录不存在或无权访问');
    }

    return reading;
  }

  /**
   * 分享占卜记录
   */
  async shareReading(id: number, userId: number): Promise<void> {
    const reading = await this.tarotReadingRepository.findOne({
      where: { id, userId },
    });

    if (!reading) {
      throw new NotFoundException('占卜记录不存在');
    }

    await this.tarotReadingRepository.update(id, {
      isPublic: true,
      shareCount: () => 'shareCount + 1',
    });
  }

  /**
   * 评价占卜记录
   */
  async rateReading(id: number, userId: number, rating: number, feedback?: string): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('评分必须在1-5之间');
    }

    const reading = await this.tarotReadingRepository.findOne({
      where: { id, userId },
    });

    if (!reading) {
      throw new NotFoundException('占卜记录不存在');
    }

    await this.tarotReadingRepository.update(id, {
      rating: rating,
      feedback: feedback,
    });
  }

  /**
   * 获取推荐牌阵
   */
  async getRecommendedSpreads(difficulty?: string): Promise<TarotSpread[]> {
    return this.tarotEngineService.getRecommendedSpreads(difficulty);
  }

  /**
   * 获取占卜统计
   */
  async getReadingStats(userId: number): Promise<{
    totalReadings: number;
    thisMonthReadings: number;
    favoriteSpread: TarotSpread | null;
    averageRating: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 总占卜次数
    const totalReadings = await this.tarotReadingRepository.count({
      where: { userId },
    });

    // 本月占卜次数
    const thisMonthReadings = await this.tarotReadingRepository.count({
      where: {
        userId,
        createdAt: Between(startOfMonth, now),
      },
    });

    // 最常用的牌阵
    const spreadUsage = await this.tarotReadingRepository
      .createQueryBuilder('reading')
      .select('reading.spreadId', 'spreadId')
      .addSelect('COUNT(*)', 'count')
      .where('reading.userId = :userId', { userId })
      .groupBy('reading.spreadId')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    let favoriteSpread: TarotSpread | null = null;
    if (spreadUsage) {
      const foundSpread = await this.tarotSpreadRepository.findOne({
        where: { id: spreadUsage.spreadId },
      });
      favoriteSpread = foundSpread || null;
    }

    // 平均评分
    const ratingResult = await this.tarotReadingRepository
      .createQueryBuilder('reading')
      .select('AVG(reading.rating)', 'averageRating')
      .where('reading.userId = :userId AND reading.rating IS NOT NULL', { userId })
      .getRawOne();

    const averageRating = ratingResult?.averageRating ? parseFloat(ratingResult.averageRating) : 0;

    return {
      totalReadings,
      thisMonthReadings,
      favoriteSpread,
      averageRating,
    };
  }
}