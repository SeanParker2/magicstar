import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TarotCard } from '../entities/tarot-card.entity';
import { TarotSpread } from '../entities/tarot-spread.entity';

/**
 * 塔罗牌算法引擎服务
 */
@Injectable()
export class TarotEngineService {
  constructor(
    @InjectRepository(TarotCard)
    private readonly tarotCardRepository: Repository<TarotCard>,
    @InjectRepository(TarotSpread)
    private readonly tarotSpreadRepository: Repository<TarotSpread>,
  ) {}

  /**
   * 随机抽取塔罗牌
   * @param cardCount 抽牌数量
   * @param excludeCards 排除的牌ID
   * @returns 抽取的牌数组
   */
  async drawRandomCards(cardCount: number, excludeCards: number[] = []): Promise<{
    cardId: number;
    isReversed: boolean;
    card: TarotCard;
  }[]> {
    // 获取所有可用的塔罗牌
    const availableCards = await this.tarotCardRepository.find({
      where: excludeCards.length > 0 ? { id: Not(In(excludeCards)) } : {},
    });

    if (availableCards.length < cardCount) {
      throw new Error('可用塔罗牌数量不足');
    }

    // 使用Fisher-Yates洗牌算法
    const shuffledCards = this.shuffleArray([...availableCards]);
    
    // 抽取指定数量的牌
    const drawnCards = shuffledCards.slice(0, cardCount).map(card => ({
      cardId: card.id,
      isReversed: Math.random() < 0.3, // 30%概率为逆位
      card,
    }));

    return drawnCards;
  }

  /**
   * 根据牌阵抽牌
   * @param spreadId 牌阵ID
   * @returns 抽取的牌和牌阵信息
   */
  async drawCardsForSpread(spreadId: number): Promise<{
    spread: TarotSpread;
    drawnCards: {
      position: number;
      cardId: number;
      isReversed: boolean;
      card: TarotCard;
    }[];
  }> {
    const spread = await this.tarotSpreadRepository.findOne({
      where: { id: spreadId, isActive: true },
    });

    if (!spread) {
      throw new Error('牌阵不存在或已禁用');
    }

    const drawnCards = await this.drawRandomCards(spread.cardCount);
    
    // 为每张牌分配位置
    const cardsWithPosition = drawnCards.map((drawnCard, index) => ({
      position: index + 1,
      ...drawnCard,
    }));

    return {
      spread,
      drawnCards: cardsWithPosition,
    };
  }

  /**
   * 生成塔罗牌解读
   * @param drawnCards 抽取的牌
   * @param spread 牌阵
   * @param question 占卜问题
   * @returns 解读结果
   */
  generateInterpretation(
    drawnCards: {
      position: number;
      cardId: number;
      isReversed: boolean;
      card: TarotCard;
    }[],
    spread: TarotSpread,
    question: string,
  ): {
    overallInterpretation: string;
    detailedInterpretation: {
      position: number;
      positionName: string;
      cardInterpretation: string;
      advice: string;
    }[];
    summary: string;
    advice: string;
  } {
    const detailedInterpretation = drawnCards.map(drawnCard => {
      const positionConfig = spread.positionsConfig.find(
        p => p.position === drawnCard.position,
      );
      
      const cardMeaning = drawnCard.isReversed 
        ? drawnCard.card.reversedMeaning 
        : drawnCard.card.uprightMeaning;
      
      const cardKeywords = drawnCard.isReversed 
        ? drawnCard.card.reversedKeywords 
        : drawnCard.card.uprightKeywords;

      return {
        position: drawnCard.position,
        positionName: positionConfig?.name || `位置${drawnCard.position}`,
        cardInterpretation: this.generateCardInterpretation(
          drawnCard.card,
          drawnCard.isReversed,
          positionConfig?.meaning || '',
          question,
        ),
        advice: this.generatePositionAdvice(
          cardMeaning,
          cardKeywords,
          positionConfig?.meaning || '',
        ),
      };
    });

    const overallInterpretation = this.generateOverallInterpretation(
      drawnCards,
      spread,
      question,
    );

    const summary = this.generateSummary(drawnCards, question);
    const advice = this.generateOverallAdvice(drawnCards, question);

    return {
      overallInterpretation,
      detailedInterpretation,
      summary,
      advice,
    };
  }

  /**
   * 生成单张牌的解读
   */
  private generateCardInterpretation(
    card: TarotCard,
    isReversed: boolean,
    positionMeaning: string,
    question: string,
  ): string {
    const orientation = isReversed ? '逆位' : '正位';
    const meaning = isReversed ? card.reversedMeaning : card.uprightMeaning;
    const keywords = isReversed ? card.reversedKeywords : card.uprightKeywords;

    return `${card.nameCn}（${orientation}）在${positionMeaning}位置出现，代表${keywords}。${meaning}。结合您的问题"${question}"，这张牌暗示着...`;
  }

  /**
   * 生成位置建议
   */
  private generatePositionAdvice(
    cardMeaning: string,
    cardKeywords: string,
    positionMeaning: string,
  ): string {
    return `基于${cardKeywords}的能量，建议您在${positionMeaning}方面...`;
  }

  /**
   * 生成整体解读
   */
  private generateOverallInterpretation(
    drawnCards: any[],
    spread: TarotSpread,
    question: string,
  ): string {
    const cardNames = drawnCards.map(dc => dc.card.nameCn).join('、');
    return `通过${spread.nameCn}牌阵，我们抽取到了${cardNames}。这些牌共同为您的问题"${question}"提供了深刻的洞察...`;
  }

  /**
   * 生成摘要
   */
  private generateSummary(drawnCards: any[], question: string): string {
    const majorCards = drawnCards.filter(dc => dc.card.type === 'major');
    const minorCards = drawnCards.filter(dc => dc.card.type === 'minor');
    
    let summary = `本次占卜共抽取${drawnCards.length}张牌，`;
    if (majorCards.length > 0) {
      summary += `其中${majorCards.length}张大阿卡纳牌显示了重要的人生主题，`;
    }
    if (minorCards.length > 0) {
      summary += `${minorCards.length}张小阿卡纳牌揭示了具体的生活细节。`;
    }
    
    return summary;
  }

  /**
   * 生成整体建议
   */
  private generateOverallAdvice(drawnCards: any[], question: string): string {
    return '综合所有牌面信息，建议您保持开放的心态，相信内在的智慧，并采取积极的行动来实现您的目标。';
  }

  /**
   * Fisher-Yates洗牌算法
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 验证牌阵配置
   */
  async validateSpread(spreadId: number): Promise<boolean> {
    const spread = await this.tarotSpreadRepository.findOne({
      where: { id: spreadId, isActive: true },
    });
    
    return !!spread && spread.positionsConfig.length === spread.cardCount;
  }

  /**
   * 获取推荐牌阵
   */
  async getRecommendedSpreads(difficulty?: string): Promise<TarotSpread[]> {
    const query = this.tarotSpreadRepository.createQueryBuilder('spread')
      .where('spread.isActive = :isActive', { isActive: true })
      .orderBy('spread.usageCount', 'DESC')
      .addOrderBy('spread.sortOrder', 'ASC')
      .limit(10);

    if (difficulty) {
      query.andWhere('spread.difficulty = :difficulty', { difficulty });
    }

    return query.getMany();
  }
}

// 需要导入的TypeORM操作符
import { Not, In } from 'typeorm';