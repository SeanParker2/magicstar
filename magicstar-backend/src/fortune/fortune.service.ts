import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { FortuneTemplate, FortuneType } from './entities/fortune-template.entity';
import { UserFortune } from './entities/user-fortune.entity';
import { FortuneHistory, OperationType } from './entities/fortune-history.entity';
import { FortuneSubscription } from './entities/fortune-subscription.entity';
import { FortuneAlgorithmService } from './fortune-algorithm.service';
import { FortuneDataService } from './fortune-data.service';
import { CreateFortuneTemplateDto } from './dto/create-fortune-template.dto';
import { UpdateFortuneTemplateDto } from './dto/update-fortune-template.dto';
import { GetFortuneDto } from './dto/get-fortune.dto';
import { GetFortuneHistoryDto } from './dto/get-fortune-history.dto';
import { CreateFortuneSubscriptionDto } from './dto/fortune-subscription.dto';
import { UpdateFortuneSubscriptionDto } from './dto/fortune-subscription.dto';
import { GetFortuneSubscriptionsDto } from './dto/fortune-subscription.dto';

@Injectable()
export class FortuneService {
  constructor(
    @InjectRepository(FortuneTemplate)
    private fortuneTemplateRepository: Repository<FortuneTemplate>,
    @InjectRepository(UserFortune)
    private userFortuneRepository: Repository<UserFortune>,
    @InjectRepository(FortuneHistory)
    private fortuneHistoryRepository: Repository<FortuneHistory>,
    @InjectRepository(FortuneSubscription)
    private fortuneSubscriptionRepository: Repository<FortuneSubscription>,
    private fortuneAlgorithmService: FortuneAlgorithmService,
    private fortuneDataService: FortuneDataService,
  ) {}

  /**
   * 获取用户运势
   */
  async getUserFortune(userId: number, dto: GetFortuneDto) {
    const { type, date } = dto;
    const targetDate = date ? new Date(date) : new Date();
    
    // 计算日期范围
    const dateRange = this.getDateRange(type, targetDate);
    
    // 查找已存在的运势
    let fortune = await this.userFortuneRepository.findOne({
      where: {
        userId,
        type,
        fortuneDate: Between(dateRange.start, dateRange.end),
      },
    });

    // 如果不存在，生成新的运势
    if (!fortune) {
      fortune = await this.generateUserFortune(userId, type, targetDate);
    }

    // 记录查看历史
    await this.recordFortuneHistory(userId, fortune.id, type, targetDate, OperationType.VIEW);

    // 更新阅读状态
    if (!fortune.isRead) {
      fortune.isRead = true;
      fortune.readAt = new Date();
      await this.userFortuneRepository.save(fortune);
    }

    return fortune;
  }

  /**
   * 生成用户运势
   */
  private async generateUserFortune(userId: number, type: FortuneType, date: Date): Promise<UserFortune> {
    // 这里需要获取用户信息，暂时使用模拟数据
    const userProfile = {
      userId,
      birthDate: new Date('1990-01-01'), // 实际应该从用户表获取
      zodiacSign: undefined, // 实际应该计算或从用户表获取
      chineseZodiac: undefined, // 实际应该计算或从用户表获取
    };

    // 获取运势模板数据
    let templates: FortuneTemplate[] = [];
    
    if (userProfile.zodiacSign) {
      // 如果有星座信息，优先使用星座模板
      templates = await this.fortuneDataService.getZodiacFortuneData(userProfile.zodiacSign, type);
    } else if (userProfile.chineseZodiac) {
      // 如果有生肖信息，使用生肖模板
      templates = await this.fortuneDataService.getChineseZodiacFortuneData(userProfile.chineseZodiac, type);
    }
    
    // 如果没有专门的模板，使用通用模板
    if (templates.length === 0) {
      templates = await this.fortuneDataService.getGeneralFortuneTemplates(type);
    }

    let fortuneData;
    switch (type) {
      case FortuneType.DAILY:
        fortuneData = await this.fortuneAlgorithmService.generateDailyFortune(userProfile, templates);
        break;
      case FortuneType.WEEKLY:
        fortuneData = await this.fortuneAlgorithmService.generateWeeklyFortune(userProfile, templates);
        break;
      case FortuneType.MONTHLY:
        fortuneData = await this.fortuneAlgorithmService.generateMonthlyFortune(userProfile, templates);
        break;
      default:
        throw new Error(`Unsupported fortune type: ${type}`);
    }

    // 确保 fortuneData 包含必需的字段
    const fortuneEntity = {
      userId,
      type,
      fortuneDate: date,
      content: fortuneData.content || '',
      scores: fortuneData.scores || {
        love: 3,
        career: 3,
        wealth: 3,
        health: 3,
        overall: 3
      },
      zodiacSign: fortuneData.zodiacSign || null,
      chineseZodiac: fortuneData.chineseZodiac || null,
      keywords: fortuneData.keywords || [],
      advice: fortuneData.advice || null,
      luckyColor: fortuneData.luckyColor || null,
      luckyNumber: fortuneData.luckyNumber || null,
      luckyDirection: fortuneData.luckyDirection || null,
      templateId: fortuneData.templateId || null,
      isRead: false
    };
    const fortune = this.userFortuneRepository.create(fortuneEntity);
    return await this.userFortuneRepository.save(fortune);
  }

  /**
   * 获取用户运势历史
   */
  async getUserFortuneHistory(userId: number, dto: GetFortuneHistoryDto) {
    const { type, page = 1, limit = 10, startDate, endDate } = dto;
    
    const queryBuilder = this.userFortuneRepository
      .createQueryBuilder('fortune')
      .where('fortune.userId = :userId', { userId })
      .orderBy('fortune.fortuneDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('fortune.type = :type', { type });
    }

    if (startDate) {
      queryBuilder.andWhere('fortune.fortuneDate >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('fortune.fortuneDate <= :endDate', { endDate: new Date(endDate) });
    }

    const [fortunes, total] = await queryBuilder.getManyAndCount();

    return {
      data: fortunes,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  /**
   * 获取运势详情
   */
  async getFortuneDetail(userId: number, fortuneId: number) {
    const fortune = await this.userFortuneRepository.findOne({
      where: { id: fortuneId, userId },
    });

    if (!fortune) {
      throw new NotFoundException('运势记录不存在');
    }

    // 记录查看历史
    await this.recordFortuneHistory(userId, fortuneId, fortune.type, fortune.fortuneDate, OperationType.VIEW);

    return fortune;
  }

  /**
   * 分享运势
   */
  async shareFortune(userId: number, fortuneId: number) {
    const fortune = await this.userFortuneRepository.findOne({
      where: { id: fortuneId, userId },
    });

    if (!fortune) {
      throw new NotFoundException('运势记录不存在');
    }

    // 记录分享历史
    await this.recordFortuneHistory(userId, fortuneId, fortune.type, fortune.fortuneDate, OperationType.SHARE);

    // 生成分享链接或返回分享数据
    return {
      fortuneId,
      shareUrl: `https://magicstar.com/fortune/share/${fortuneId}`,
      shareText: `我的${this.getFortuneTypeName(fortune.type)}运势：${fortune.content.substring(0, 50)}...`,
      shareImage: null, // 可以生成运势图片
    };
  }

  /**
   * 删除运势记录
   */
  async deleteFortune(userId: number, fortuneId: number) {
    const fortune = await this.userFortuneRepository.findOne({
      where: { id: fortuneId, userId },
    });

    if (!fortune) {
      throw new NotFoundException('运势记录不存在');
    }

    // 记录删除历史
    await this.recordFortuneHistory(userId, fortuneId, fortune.type, fortune.fortuneDate, OperationType.DELETE);

    await this.userFortuneRepository.remove(fortune);
    
    return { message: '删除成功' };
  }

  /**
   * 创建运势模板（管理员功能）
   */
  async createFortuneTemplate(dto: CreateFortuneTemplateDto) {
    const template = this.fortuneTemplateRepository.create(dto);
    return await this.fortuneTemplateRepository.save(template);
  }

  /**
   * 更新运势模板（管理员功能）
   */
  async updateFortuneTemplate(id: number, dto: UpdateFortuneTemplateDto) {
    const template = await this.fortuneTemplateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('运势模板不存在');
    }

    Object.assign(template, dto);
    return await this.fortuneTemplateRepository.save(template);
  }

  /**
   * 删除运势模板（管理员功能）
   */
  async deleteFortuneTemplate(id: number) {
    const template = await this.fortuneTemplateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('运势模板不存在');
    }

    await this.fortuneTemplateRepository.remove(template);
    return { message: '删除成功' };
  }

  /**
   * 获取运势模板列表（管理员功能）
   */
  async getFortuneTemplates(page = 1, limit = 10, type?: FortuneType) {
    const queryBuilder = this.fortuneTemplateRepository
      .createQueryBuilder('template')
      .orderBy('template.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.where('template.type = :type', { type });
    }

    const [templates, total] = await queryBuilder.getManyAndCount();

    return {
      data: templates,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  /**
   * 获取运势统计
   */
  async getFortuneStats(userId: number) {
    const today = new Date();
    const weekStart = this.getWeekStart(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailyCount, weeklyCount, monthlyCount, totalCount] = await Promise.all([
      this.userFortuneRepository.count({
        where: {
          userId,
          type: FortuneType.DAILY,
          createdAt: MoreThan(today),
        },
      }),
      this.userFortuneRepository.count({
        where: {
          userId,
          type: FortuneType.WEEKLY,
          createdAt: MoreThan(weekStart),
        },
      }),
      this.userFortuneRepository.count({
        where: {
          userId,
          type: FortuneType.MONTHLY,
          createdAt: MoreThan(monthStart),
        },
      }),
      this.userFortuneRepository.count({ where: { userId } }),
    ]);

    return {
      daily: dailyCount,
      weekly: weeklyCount,
      monthly: monthlyCount,
      total: totalCount,
    };
  }

  // 私有辅助方法
  private async recordFortuneHistory(
    userId: number,
    fortuneId: number,
    type: FortuneType,
    fortuneDate: Date,
    operation: OperationType,
    source = 'web',
    metadata?: any
  ) {
    const history = this.fortuneHistoryRepository.create({
      userId,
      fortuneId,
      type,
      fortuneDate,
      operation,
      source,
      metadata,
    });

    await this.fortuneHistoryRepository.save(history);
  }

  private getDateRange(type: FortuneType, date: Date) {
    const start = new Date(date);
    const end = new Date(date);

    switch (type) {
      case FortuneType.DAILY:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case FortuneType.WEEKLY:
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case FortuneType.MONTHLY:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  private getFortuneTypeName(type: FortuneType): string {
    const names = {
      [FortuneType.DAILY]: '今日',
      [FortuneType.WEEKLY]: '本周',
      [FortuneType.MONTHLY]: '本月',
    };
    return names[type] || type;
  }

  /**
   * 创建运势订阅
   */
  async createFortuneSubscription(userId: number, dto: CreateFortuneSubscriptionDto) {
    // 检查是否已存在相同类型的订阅
    const existingSubscription = await this.fortuneSubscriptionRepository.findOne({
      where: { userId, type: dto.type },
    });

    if (existingSubscription) {
      throw new Error('该运势类型的订阅已存在');
    }

    const subscription = this.fortuneSubscriptionRepository.create({
      ...dto,
      userId,
    });

    return await this.fortuneSubscriptionRepository.save(subscription);
  }

  /**
   * 获取用户运势订阅列表
   */
  async getFortuneSubscriptions(userId: number, dto: GetFortuneSubscriptionsDto) {
    const { type, enabled } = dto;
    
    const queryBuilder = this.fortuneSubscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.userId = :userId', { userId })
      .orderBy('subscription.createdAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('subscription.type = :type', { type });
    }

    if (enabled !== undefined) {
      queryBuilder.andWhere('subscription.enabled = :enabled', { enabled });
    }

    return await queryBuilder.getMany();
  }

  /**
   * 更新运势订阅
   */
  async updateFortuneSubscription(userId: number, subscriptionId: number, dto: UpdateFortuneSubscriptionDto) {
    const subscription = await this.fortuneSubscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('运势订阅不存在');
    }

    Object.assign(subscription, dto);
    return await this.fortuneSubscriptionRepository.save(subscription);
  }

  /**
   * 删除运势订阅
   */
  async deleteFortuneSubscription(userId: number, subscriptionId: number) {
    const subscription = await this.fortuneSubscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('运势订阅不存在');
    }

    await this.fortuneSubscriptionRepository.remove(subscription);
    return { message: '删除成功' };
  }

  /**
   * 获取运势提醒设置
   */
  async getFortuneReminderSettings(userId: number) {
    const subscriptions = await this.fortuneSubscriptionRepository.find({
      where: { userId },
      order: { type: 'ASC' },
    });

    // 转换为前端需要的格式
    const settings = {
      isEnabled: subscriptions.some(sub => sub.enabled),
      daily: subscriptions.find(sub => sub.type === FortuneType.DAILY) || null,
      weekly: subscriptions.find(sub => sub.type === FortuneType.WEEKLY) || null,
      monthly: subscriptions.find(sub => sub.type === FortuneType.MONTHLY) || null,
    };

    return settings;
  }

  /**
   * 保存运势提醒设置
   */
  async saveFortuneReminderSettings(userId: number, settings: any) {
    const { isEnabled, daily, weekly, monthly } = settings;

    // 处理每日提醒设置
    if (daily) {
      await this.upsertSubscription(userId, FortuneType.DAILY, {
        ...daily,
        enabled: isEnabled && daily.enabled,
      });
    }

    // 处理每周提醒设置
    if (weekly) {
      await this.upsertSubscription(userId, FortuneType.WEEKLY, {
        ...weekly,
        enabled: isEnabled && weekly.enabled,
      });
    }

    // 处理每月提醒设置
    if (monthly) {
      await this.upsertSubscription(userId, FortuneType.MONTHLY, {
        ...monthly,
        enabled: isEnabled && monthly.enabled,
      });
    }

    return { message: '设置保存成功' };
  }

  /**
   * 发送测试提醒
   */
  async sendTestReminder(userId: number, fortuneType: FortuneType) {
    // 这里应该调用通知服务发送测试提醒
    // 暂时返回模拟数据
    const testMessage = {
      title: `${this.getFortuneTypeName(fortuneType)}运势提醒`,
      content: '这是一条测试提醒消息，您的运势已更新！',
      timestamp: new Date(),
    };

    // TODO: 集成实际的推送服务
    console.log('发送测试提醒:', testMessage);

    return {
      success: true,
      message: '测试提醒已发送',
      data: testMessage,
    };
  }

  /**
   * 创建或更新订阅（私有方法）
   */
  private async upsertSubscription(userId: number, type: FortuneType, data: any) {
    let subscription = await this.fortuneSubscriptionRepository.findOne({
      where: { userId, type },
    });

    if (subscription) {
      // 更新现有订阅
      Object.assign(subscription, data);
      return await this.fortuneSubscriptionRepository.save(subscription);
    } else {
      // 创建新订阅
      const newSubscription = this.fortuneSubscriptionRepository.create({
        userId,
        type,
        ...data,
      });
      return await this.fortuneSubscriptionRepository.save(newSubscription);
    }
  }
}