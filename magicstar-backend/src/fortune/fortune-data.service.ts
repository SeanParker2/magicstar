import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { FortuneTemplate, FortuneType, ZodiacSign, ChineseZodiac } from './entities/fortune-template.entity';

@Injectable()
export class FortuneDataService {
  private readonly logger = new Logger(FortuneDataService.name);
  private cache = new Map<string, FortuneTemplate[]>();

  constructor(
    @InjectRepository(FortuneTemplate)
    private fortuneTemplateRepository: Repository<FortuneTemplate>,
  ) {}

  /**
   * 初始化运势模板数据
   */
  async initializeFortuneTemplates(): Promise<void> {
    this.logger.log('开始初始化运势模板数据...');
    
    const existingCount = await this.fortuneTemplateRepository.count();
    if (existingCount > 0) {
      this.logger.log(`运势模板数据已存在 ${existingCount} 条，跳过初始化`);
      return;
    }

    const templates = await this.generateDefaultTemplates();
    await this.fortuneTemplateRepository.save(templates);
    
    this.logger.log(`成功初始化 ${templates.length} 条运势模板数据`);
  }

  /**
   * 获取星座运势数据
   */
  async getZodiacFortuneData(
    zodiacSign: ZodiacSign,
    type: FortuneType,
  ): Promise<FortuneTemplate[]> {
    const cacheKey = `zodiac_${zodiacSign}_${type}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`从缓存获取星座运势数据: ${zodiacSign} - ${type}`);
      return cached;
    }

    // 从数据库查询
    const templates = await this.fortuneTemplateRepository.find({
      where: {
        zodiacSign,
        type,
        active: true,
      },
      order: { weight: 'DESC' },
    });

    // 存入缓存
    this.cache.set(cacheKey, templates);
    this.logger.debug(`查询并缓存星座运势数据: ${zodiacSign} - ${type}, 共 ${templates.length} 条`);
    
    return templates;
  }

  /**
   * 获取生肖运势数据
   */
  async getChineseZodiacFortuneData(
    chineseZodiac: ChineseZodiac,
    type: FortuneType,
  ): Promise<FortuneTemplate[]> {
    const cacheKey = `chinese_zodiac_${chineseZodiac}_${type}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`从缓存获取生肖运势数据: ${chineseZodiac} - ${type}`);
      return cached;
    }

    // 从数据库查询
    const templates = await this.fortuneTemplateRepository.find({
      where: {
        chineseZodiac,
        type,
        active: true,
      },
      order: { weight: 'DESC' },
    });

    // 存入缓存
    this.cache.set(cacheKey, templates);
    this.logger.debug(`查询并缓存生肖运势数据: ${chineseZodiac} - ${type}, 共 ${templates.length} 条`);
    
    return templates;
  }

  /**
   * 获取通用运势模板数据
   */
  async getGeneralFortuneTemplates(type: FortuneType): Promise<FortuneTemplate[]> {
    const cacheKey = `general_${type}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`从缓存获取通用运势模板: ${type}`);
      return cached;
    }

    // 从数据库查询通用模板（不指定星座和生肖）
    const templates = await this.fortuneTemplateRepository.find({
      where: {
        type,
        zodiacSign: IsNull(),
        chineseZodiac: IsNull(),
        active: true,
      },
      order: { weight: 'DESC' },
    });

    // 存入缓存
    this.cache.set(cacheKey, templates);
    this.logger.debug(`查询并缓存通用运势模板: ${type}, 共 ${templates.length} 条`);
    
    return templates;
  }

  /**
   * 清除运势数据缓存
   */
  async clearFortuneCache(type?: FortuneType): Promise<void> {
    if (type) {
      // 清除特定类型的缓存
      const keysToDelete: string[] = [];
       for (const [key] of this.cache) {
         if (key.includes(type)) {
           keysToDelete.push(key);
         }
       }
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
      
      this.logger.log(`清除运势类型 ${type} 的缓存`);
    } else {
      // 清除所有运势缓存
      this.cache.clear();
      this.logger.log('清除所有运势数据缓存');
    }
  }

  /**
   * 生成默认运势模板数据
   */
  private async generateDefaultTemplates(): Promise<Partial<FortuneTemplate>[]> {
    const templates: Partial<FortuneTemplate>[] = [];
    
    // 生成今日运势模板
    templates.push(...this.generateDailyTemplates());
    
    // 生成本周运势模板
    templates.push(...this.generateWeeklyTemplates());
    
    // 生成本月运势模板
    templates.push(...this.generateMonthlyTemplates());
    
    return templates;
  }

  /**
   * 生成今日运势模板
   */
  private generateDailyTemplates(): Partial<FortuneTemplate>[] {
    const templates: Partial<FortuneTemplate>[] = [];
    
    // 通用今日运势模板
    const dailyTemplates = [
      {
        type: FortuneType.DAILY,
        content: '今天是充满机遇的一天，保持积极的心态，好运将会降临。',
        loveScore: 85,
        careerScore: 78,
        wealthScore: 82,
        healthScore: 90,
        keywords: '机遇,积极,好运',
        advice: '把握今天的每一个机会，相信自己的直觉。',
        luckyColor: '金色',
        luckyDirection: '东南',
        weight: 80,
        active: true,
      },
      {
        type: FortuneType.DAILY,
        content: '今日适合静心思考，避免冲动决定，稳中求进是最佳策略。',
        loveScore: 70,
        careerScore: 85,
        wealthScore: 75,
        healthScore: 88,
        keywords: '静心,思考,稳重',
        advice: '多听取他人意见，做决定前三思而后行。',
        luckyColor: '蓝色',
        luckyDirection: '北方',
        weight: 75,
        isActive: true,
      },
    ];
    
    templates.push(...dailyTemplates);
    return templates;
  }

  /**
   * 生成本周运势模板
   */
  private generateWeeklyTemplates(): Partial<FortuneTemplate>[] {
    const templates: Partial<FortuneTemplate>[] = [];
    
    const weeklyTemplates = [
      {
        type: FortuneType.WEEKLY,
        content: '本周整体运势上升，工作和感情都有不错的发展机会。',
        loveScore: 88,
        careerScore: 92,
        wealthScore: 85,
        healthScore: 80,
        keywords: '上升,发展,机会',
        advice: '积极主动出击，本周是展现自己的好时机。',
        luckyColor: '红色',
        luckyDirection: '南方',
        weight: 85,
        isActive: true,
      },
      {
        type: FortuneType.WEEKLY,
        content: '本周需要注意人际关系，避免不必要的争执，和谐相处。',
        loveScore: 75,
        careerScore: 80,
        wealthScore: 78,
        healthScore: 85,
        keywords: '人际,和谐,相处',
        advice: '多一些包容和理解，化解矛盾于无形。',
        luckyColor: '绿色',
        luckyDirection: '东方',
        weight: 80,
        isActive: true,
      },
    ];
    
    templates.push(...weeklyTemplates);
    return templates;
  }

  /**
   * 生成本月运势模板
   */
  private generateMonthlyTemplates(): Partial<FortuneTemplate>[] {
    const templates: Partial<FortuneTemplate>[] = [];
    
    const monthlyTemplates = [
      {
        type: FortuneType.MONTHLY,
        content: '本月是收获的季节，前期的努力将会得到回报，财运亨通。',
        loveScore: 90,
        careerScore: 95,
        wealthScore: 92,
        healthScore: 85,
        keywords: '收获,回报,财运',
        advice: '继续保持努力，同时要学会享受成功的喜悦。',
        luckyColor: '紫色',
        luckyDirection: '西南',
        weight: 90,
        isActive: true,
      },
      {
        type: FortuneType.MONTHLY,
        content: '本月适合学习和充电，提升自己的能力和见识。',
        loveScore: 80,
        careerScore: 88,
        wealthScore: 75,
        healthScore: 90,
        keywords: '学习,充电,提升',
        advice: '投资自己永远不会错，知识就是最大的财富。',
        luckyColor: '白色',
        luckyDirection: '西方',
        weight: 85,
        isActive: true,
      },
    ];
    
    templates.push(...monthlyTemplates);
    return templates;
  }

  /**
   * 刷新运势数据缓存
   */
  async refreshFortuneCache(): Promise<void> {
    this.logger.log('开始刷新运势数据缓存...');
    
    // 清除现有缓存
    await this.clearFortuneCache();
    
    // 预热缓存 - 加载常用的运势数据
    const fortuneTypes = [FortuneType.DAILY, FortuneType.WEEKLY, FortuneType.MONTHLY];
    
    for (const type of fortuneTypes) {
      // 预热通用模板
      await this.getGeneralFortuneTemplates(type);
      
      // 预热星座数据
      for (const zodiac of Object.values(ZodiacSign)) {
        await this.getZodiacFortuneData(zodiac, type);
      }
      
      // 预热生肖数据
      for (const chineseZodiac of Object.values(ChineseZodiac)) {
        await this.getChineseZodiacFortuneData(chineseZodiac, type);
      }
    }
    
    this.logger.log('运势数据缓存刷新完成');
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    const cacheKeys = [
      'fortune_templates_daily',
      'fortune_templates_weekly', 
      'fortune_templates_monthly',
      'zodiac_templates',
      'chinese_zodiac_templates',
      'general_templates'
    ];
    
    const stats = {};
    for (const key of cacheKeys) {
      const value = this.cache.get(key);
      stats[key] = value ? 'cached' : 'not_cached';
    }
    
    return stats;
  }

  /**
   * 清除所有运势缓存
   */
  async clearCache(): Promise<void> {
    const cacheKeys = [
      'fortune_templates_daily',
      'fortune_templates_weekly', 
      'fortune_templates_monthly',
      'zodiac_templates',
      'chinese_zodiac_templates',
      'general_templates'
    ];
    
    for (const key of cacheKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * 刷新所有运势缓存
   */
  async refreshCache(): Promise<void> {
    await this.clearCache();
    
    // 重新加载所有缓存
    await this.getGeneralFortuneTemplates(FortuneType.DAILY);
    await this.getGeneralFortuneTemplates(FortuneType.WEEKLY);
    await this.getGeneralFortuneTemplates(FortuneType.MONTHLY);
    
    // 预加载一些常用的星座和生肖数据
    const commonZodiacs = [ZodiacSign.ARIES, ZodiacSign.TAURUS, ZodiacSign.GEMINI];
    const commonChineseZodiacs = [ChineseZodiac.RAT, ChineseZodiac.OX, ChineseZodiac.TIGER];
    
    for (const zodiac of commonZodiacs) {
      await this.getZodiacFortuneData(zodiac, FortuneType.DAILY);
    }
    
    for (const chineseZodiac of commonChineseZodiacs) {
      await this.getChineseZodiacFortuneData(chineseZodiac, FortuneType.DAILY);
    }
  }

  /**
   * 获取模板统计信息
   */
  async getTemplateStats() {
    const totalCount = await this.fortuneTemplateRepository.count();
    
    const dailyCount = await this.fortuneTemplateRepository.count({
      where: { type: FortuneType.DAILY }
    });
    
    const weeklyCount = await this.fortuneTemplateRepository.count({
      where: { type: FortuneType.WEEKLY }
    });
    
    const monthlyCount = await this.fortuneTemplateRepository.count({
      where: { type: FortuneType.MONTHLY }
    });
    
    const zodiacCount = await this.fortuneTemplateRepository.count({
      where: { zodiacSign: Not(IsNull()) }
    });
    
    const chineseZodiacCount = await this.fortuneTemplateRepository.count({
      where: { chineseZodiac: Not(IsNull()) }
    });
    
    return {
      total: totalCount,
      daily: dailyCount,
      weekly: weeklyCount,
      monthly: monthlyCount,
      zodiac: zodiacCount,
      chineseZodiac: chineseZodiacCount,
    };
  }
}