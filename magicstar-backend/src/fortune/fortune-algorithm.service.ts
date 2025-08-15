import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FortuneTemplate, FortuneType, ZodiacSign, ChineseZodiac } from './entities/fortune-template.entity';
import { UserFortune } from './entities/user-fortune.entity';

interface UserProfile {
  userId: number;
  birthDate: Date;
  zodiacSign?: ZodiacSign;
  chineseZodiac?: ChineseZodiac;
  gender?: 'male' | 'female';
}

interface FortuneScores {
  love: number;
  career: number;
  wealth: number;
  health: number;
  overall: number;
}

@Injectable()
export class FortuneAlgorithmService {
  constructor(
    @InjectRepository(FortuneTemplate)
    private fortuneTemplateRepository: Repository<FortuneTemplate>,
  ) {}

  /**
   * 生成今日运势
   */
  async generateDailyFortune(userProfile: UserProfile, templates: FortuneTemplate[] = []): Promise<Partial<UserFortune>> {
    const today = new Date();
    const baseScores = this.calculateBaseScores(userProfile, today, FortuneType.DAILY);
    const template = this.selectTemplateFromList(templates, FortuneType.DAILY);
    
    return {
      userId: userProfile.userId,
      type: FortuneType.DAILY,
      fortuneDate: today,
      zodiacSign: userProfile.zodiacSign,
      chineseZodiac: userProfile.chineseZodiac,
      content: this.personalizeContent(template.content, userProfile, baseScores),
      scores: this.adjustScores(baseScores, template.scores),
      keywords: template.keywords ? template.keywords.split(',') : [],
      advice: this.generatePersonalizedAdvice(template.advice, userProfile, baseScores),
      luckyColor: template.luckyColor,
      luckyNumber: this.generateLuckyNumber(userProfile, today),
      luckyDirection: template.luckyDirection,
      templateId: template.id,
    };
  }

  /**
   * 生成本周运势
   */
  async generateWeeklyFortune(userProfile: UserProfile, templates: FortuneTemplate[] = []): Promise<Partial<UserFortune>> {
    const weekStart = this.getWeekStart(new Date());
    const baseScores = this.calculateBaseScores(userProfile, weekStart, FortuneType.WEEKLY);
    const template = this.selectTemplateFromList(templates, FortuneType.WEEKLY);
    
    return {
      userId: userProfile.userId,
      type: FortuneType.WEEKLY,
      fortuneDate: weekStart,
      zodiacSign: userProfile.zodiacSign,
      chineseZodiac: userProfile.chineseZodiac,
      content: this.personalizeContent(template.content, userProfile, baseScores),
      scores: this.adjustScores(baseScores, template.scores),
      keywords: template.keywords ? template.keywords.split(',') : [],
      advice: this.generatePersonalizedAdvice(template.advice, userProfile, baseScores),
      luckyColor: template.luckyColor,
      luckyNumber: this.generateLuckyNumber(userProfile, weekStart),
      luckyDirection: template.luckyDirection,
      templateId: template.id,
    };
  }

  /**
   * 生成本月运势
   */
  async generateMonthlyFortune(userProfile: UserProfile, templates: FortuneTemplate[] = []): Promise<Partial<UserFortune>> {
    const monthStart = this.getMonthStart(new Date());
    const baseScores = this.calculateBaseScores(userProfile, monthStart, FortuneType.MONTHLY);
    const template = this.selectTemplateFromList(templates, FortuneType.MONTHLY);
    
    return {
      userId: userProfile.userId,
      type: FortuneType.MONTHLY,
      fortuneDate: monthStart,
      zodiacSign: userProfile.zodiacSign,
      chineseZodiac: userProfile.chineseZodiac,
      content: this.personalizeContent(template.content, userProfile, baseScores),
      scores: this.adjustScores(baseScores, template.scores),
      keywords: template.keywords ? template.keywords.split(',') : [],
      advice: this.generatePersonalizedAdvice(template.advice, userProfile, baseScores),
      luckyColor: template.luckyColor,
      luckyNumber: this.generateLuckyNumber(userProfile, monthStart),
      luckyDirection: template.luckyDirection,
      templateId: template.id,
    };
  }

  /**
   * 计算基础运势分数
   */
  private calculateBaseScores(userProfile: UserProfile, date: Date, type: FortuneType): FortuneScores {
    // 基于用户生日、星座、生肖和当前日期计算基础分数
    const birthDate = userProfile.birthDate;
    const dayOfYear = this.getDayOfYear(date);
    const birthDayOfYear = this.getDayOfYear(birthDate);
    
    // 使用伪随机算法，确保同一用户同一天的运势是一致的
    const seed = userProfile.userId + dayOfYear + (type === FortuneType.WEEKLY ? 1000 : type === FortuneType.MONTHLY ? 2000 : 0);
    const random = this.seededRandom(seed);
    
    // 星座影响因子
    const zodiacFactor = userProfile.zodiacSign 
      ? this.getZodiacFactor(userProfile.zodiacSign, date)
      : { love: 0, career: 0, wealth: 0, health: 0 };
    
    // 生肖影响因子
    const chineseZodiacFactor = userProfile.chineseZodiac 
      ? this.getChineseZodiacFactor(userProfile.chineseZodiac, date)
      : { love: 0, career: 0, wealth: 0, health: 0 };
    
    // 生日周期影响
    const birthdayCycleFactor = this.getBirthdayCycleFactor(birthDayOfYear, dayOfYear);
    
    return {
      love: Math.max(1, Math.min(5, Math.round(3 + random() * 2 + zodiacFactor.love + chineseZodiacFactor.love + birthdayCycleFactor))),
      career: Math.max(1, Math.min(5, Math.round(3 + random() * 2 + zodiacFactor.career + chineseZodiacFactor.career + birthdayCycleFactor))),
      wealth: Math.max(1, Math.min(5, Math.round(3 + random() * 2 + zodiacFactor.wealth + chineseZodiacFactor.wealth + birthdayCycleFactor))),
      health: Math.max(1, Math.min(5, Math.round(3 + random() * 2 + zodiacFactor.health + chineseZodiacFactor.health + birthdayCycleFactor))),
      overall: 0, // 将在后面计算
    };
  }

  /**
   * 从模板列表中选择运势模板
   */
  private selectTemplateFromList(
    templates: FortuneTemplate[],
    type: FortuneType
  ): FortuneTemplate {
    if (templates.length === 0) {
      // 如果没有模板，返回默认模板
      return this.getDefaultTemplate(type);
    }
    
    // 使用权重随机选择
    return this.weightedRandomSelect(templates);
  }

  /**
   * 获取默认模板
   */
  private getDefaultTemplate(type: FortuneType): FortuneTemplate {
    const defaultTemplate = {
      id: 0,
      type,
      zodiacSign: undefined,
      chineseZodiac: undefined,
      content: '今天是充满可能性的一天，保持积极的心态。',
      scores: { love: 3, career: 3, wealth: 3, health: 3, overall: 3 },
      keywords: '积极,可能性,平衡',
      advice: '保持开放的心态，迎接新的机遇。',
      luckyColor: '#FFFFFF',
      luckyNumber: 7,
      luckyDirection: '中央',
      weight: 50,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as FortuneTemplate;
    
    return defaultTemplate;
  }

  /**
   * 选择合适的运势模板
   */
  private async selectTemplate(
    type: FortuneType,
    zodiacSign?: ZodiacSign,
    chineseZodiac?: ChineseZodiac
  ): Promise<FortuneTemplate> {
    // 优先选择匹配星座和生肖的模板
    let templates = await this.fortuneTemplateRepository.find({
      where: {
        type,
        zodiacSign,
        chineseZodiac,
        active: true,
      },
    });

    // 如果没有完全匹配的，选择匹配星座的
    if (templates.length === 0 && zodiacSign) {
      templates = await this.fortuneTemplateRepository.find({
        where: {
          type,
          zodiacSign,
          active: true,
        },
      });
    }

    // 如果还没有，选择匹配生肖的
    if (templates.length === 0 && chineseZodiac) {
      templates = await this.fortuneTemplateRepository.find({
        where: {
          type,
          chineseZodiac,
          active: true,
        },
      });
    }

    // 最后选择通用模板
    if (templates.length === 0) {
      templates = await this.fortuneTemplateRepository.find({
        where: {
          type,
          active: true,
        },
      });
    }

    if (templates.length === 0) {
      throw new Error(`No fortune template found for type: ${type}`);
    }

    // 根据权重随机选择
    return this.weightedRandomSelect(templates);
  }

  /**
   * 个性化内容
   */
  private personalizeContent(content: string, userProfile: UserProfile, scores: FortuneScores): string {
    // 根据用户信息和分数个性化内容
    let personalizedContent = content;
    
    // 替换占位符
    if (userProfile.zodiacSign) {
      personalizedContent = personalizedContent.replace(/\{zodiac\}/g, this.getZodiacName(userProfile.zodiacSign));
    }
    
    if (userProfile.chineseZodiac) {
      personalizedContent = personalizedContent.replace(/\{chineseZodiac\}/g, this.getChineseZodiacName(userProfile.chineseZodiac));
    }
    
    // 根据分数调整语气
    if (scores.overall >= 4) {
      personalizedContent = personalizedContent.replace(/\{tone\}/g, '非常积极');
    } else if (scores.overall >= 3) {
      personalizedContent = personalizedContent.replace(/\{tone\}/g, '积极');
    } else {
      personalizedContent = personalizedContent.replace(/\{tone\}/g, '谨慎');
    }
    
    return personalizedContent;
  }

  /**
   * 调整运势分数
   */
  private adjustScores(baseScores: FortuneScores, templateScores: FortuneScores): FortuneScores {
    const adjusted = {
      love: Math.max(1, Math.min(5, Math.round((baseScores.love + templateScores.love) / 2))),
      career: Math.max(1, Math.min(5, Math.round((baseScores.career + templateScores.career) / 2))),
      wealth: Math.max(1, Math.min(5, Math.round((baseScores.wealth + templateScores.wealth) / 2))),
      health: Math.max(1, Math.min(5, Math.round((baseScores.health + templateScores.health) / 2))),
      overall: 0,
    };
    
    // 计算综合分数
    adjusted.overall = Math.round((adjusted.love + adjusted.career + adjusted.wealth + adjusted.health) / 4);
    
    return adjusted;
  }

  /**
   * 生成个性化建议
   */
  private generatePersonalizedAdvice(advice: string, userProfile: UserProfile, scores: FortuneScores): string {
    if (!advice) return '';
    
    let personalizedAdvice = advice;
    
    // 根据最低分数项目给出针对性建议
    const minScore = Math.min(scores.love, scores.career, scores.wealth, scores.health);
    const weakAreas: string[] = [];
    
    if (scores.love === minScore) weakAreas.push('感情');
    if (scores.career === minScore) weakAreas.push('事业');
    if (scores.wealth === minScore) weakAreas.push('财运');
    if (scores.health === minScore) weakAreas.push('健康');
    
    if (weakAreas.length > 0) {
      personalizedAdvice += ` 特别注意${weakAreas.join('和')}方面的发展。`;
    }
    
    return personalizedAdvice;
  }

  /**
   * 生成幸运数字
   */
  private generateLuckyNumber(userProfile: UserProfile, date: Date): number {
    const seed = userProfile.userId + this.getDayOfYear(date);
    const random = this.seededRandom(seed);
    return Math.floor(random() * 9) + 1; // 1-9
  }

  // 辅助方法
  private seededRandom(seed: number): () => number {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一为一周开始
    return new Date(d.setDate(diff));
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private getZodiacFactor(zodiacSign: ZodiacSign, date: Date): Omit<FortuneScores, 'overall'> {
    // 简化的星座影响因子，实际可以更复杂
    const factors = {
      [ZodiacSign.ARIES]: { love: 0.2, career: 0.3, wealth: 0.1, health: 0.2 },
      [ZodiacSign.TAURUS]: { love: 0.1, career: 0.2, wealth: 0.3, health: 0.1 },
      [ZodiacSign.GEMINI]: { love: 0.3, career: 0.1, wealth: 0.2, health: 0.1 },
      // ... 其他星座
    };
    
    return factors[zodiacSign] || { love: 0, career: 0, wealth: 0, health: 0 };
  }

  private getChineseZodiacFactor(chineseZodiac: ChineseZodiac, date: Date): Omit<FortuneScores, 'overall'> {
    // 简化的生肖影响因子
    const factors = {
      [ChineseZodiac.RAT]: { love: 0.1, career: 0.2, wealth: 0.3, health: 0.1 },
      [ChineseZodiac.OX]: { love: 0.2, career: 0.3, wealth: 0.1, health: 0.2 },
      // ... 其他生肖
    };
    
    return factors[chineseZodiac] || { love: 0, career: 0, wealth: 0, health: 0 };
  }

  private getBirthdayCycleFactor(birthDayOfYear: number, currentDayOfYear: number): number {
    // 生日周期影响，生日附近运势更好
    const diff = Math.abs(currentDayOfYear - birthDayOfYear);
    if (diff <= 7) return 0.5; // 生日前后一周
    if (diff <= 30) return 0.2; // 生日前后一月
    return 0;
  }

  private weightedRandomSelect<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return items[items.length - 1];
  }

  private getZodiacName(zodiacSign: ZodiacSign): string {
    const names = {
      [ZodiacSign.ARIES]: '白羊座',
      [ZodiacSign.TAURUS]: '金牛座',
      [ZodiacSign.GEMINI]: '双子座',
      [ZodiacSign.CANCER]: '巨蟹座',
      [ZodiacSign.LEO]: '狮子座',
      [ZodiacSign.VIRGO]: '处女座',
      [ZodiacSign.LIBRA]: '天秤座',
      [ZodiacSign.SCORPIO]: '天蝎座',
      [ZodiacSign.SAGITTARIUS]: '射手座',
      [ZodiacSign.CAPRICORN]: '摩羯座',
      [ZodiacSign.AQUARIUS]: '水瓶座',
      [ZodiacSign.PISCES]: '双鱼座',
    };
    return names[zodiacSign] || zodiacSign;
  }

  private getChineseZodiacName(chineseZodiac: ChineseZodiac): string {
    const names = {
      [ChineseZodiac.RAT]: '鼠',
      [ChineseZodiac.OX]: '牛',
      [ChineseZodiac.TIGER]: '虎',
      [ChineseZodiac.RABBIT]: '兔',
      [ChineseZodiac.DRAGON]: '龙',
      [ChineseZodiac.SNAKE]: '蛇',
      [ChineseZodiac.HORSE]: '马',
      [ChineseZodiac.GOAT]: '羊',
      [ChineseZodiac.MONKEY]: '猴',
      [ChineseZodiac.ROOSTER]: '鸡',
      [ChineseZodiac.DOG]: '狗',
      [ChineseZodiac.PIG]: '猪',
    };
    return names[chineseZodiac] || chineseZodiac;
  }
}