import { request } from './api';

// 运势类型枚举
export enum FortuneType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// 星座枚举
export enum ZodiacSign {
  ARIES = 'aries', // 白羊座
  TAURUS = 'taurus', // 金牛座
  GEMINI = 'gemini', // 双子座
  CANCER = 'cancer', // 巨蟹座
  LEO = 'leo', // 狮子座
  VIRGO = 'virgo', // 处女座
  LIBRA = 'libra', // 天秤座
  SCORPIO = 'scorpio', // 天蝎座
  SAGITTARIUS = 'sagittarius', // 射手座
  CAPRICORN = 'capricorn', // 摩羯座
  AQUARIUS = 'aquarius', // 水瓶座
  PISCES = 'pisces', // 双鱼座
}

// 生肖枚举
export enum ChineseZodiac {
  RAT = 'rat', // 鼠
  OX = 'ox', // 牛
  TIGER = 'tiger', // 虎
  RABBIT = 'rabbit', // 兔
  DRAGON = 'dragon', // 龙
  SNAKE = 'snake', // 蛇
  HORSE = 'horse', // 马
  GOAT = 'goat', // 羊
  MONKEY = 'monkey', // 猴
  ROOSTER = 'rooster', // 鸡
  DOG = 'dog', // 狗
  PIG = 'pig', // 猪
}

// 运势分数接口
export interface FortuneScores {
  love: number; // 爱情运势 (1-5)
  career: number; // 事业运势 (1-5)
  wealth: number; // 财运 (1-5)
  health: number; // 健康运势 (1-5)
  overall: number; // 综合运势 (1-5)
}

// 运势详情接口
export interface Fortune {
  id: number;
  type: FortuneType;
  zodiacSign?: ZodiacSign;
  chineseZodiac?: ChineseZodiac;
  content: string;
  scores: FortuneScores;
  keywords?: string;
  advice?: string;
  luckyColor?: string;
  luckyNumber?: number;
  luckyDirection?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// 获取运势请求参数
export interface GetFortuneRequest {
  type: FortuneType;
  date?: string; // YYYY-MM-DD格式
}

// 获取运势历史请求参数
export interface GetFortuneHistoryRequest {
  type?: FortuneType;
  page?: number;
  limit?: number;
  startDate?: string; // YYYY-MM-DD格式
  endDate?: string; // YYYY-MM-DD格式
}

// 运势历史响应
export interface FortuneHistoryResponse {
  data: Fortune[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 运势统计接口
export interface FortuneStats {
  totalCount: number;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  averageScores: FortuneScores;
  recentActivity: {
    date: string;
    count: number;
  }[];
}

// 运势趋势数据接口
export interface FortuneTrendData {
  date: string;
  scores: FortuneScores;
}

// 运势趋势统计接口
export interface FortuneTrendStats {
  period: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  trend: 'up' | 'down' | 'stable';
  data: FortuneTrendData[];
}

// 运势订阅接口
export interface FortuneSubscription {
  id: number;
  type: FortuneType;
  enabled: boolean;
  pushTypes: string[];
  reminderTime: string;
  weeklyDay?: number;
  monthlyDay?: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建运势订阅请求
export interface CreateFortuneSubscriptionRequest {
  type: FortuneType;
  enabled?: boolean;
  pushTypes?: string[];
  reminderTime?: string;
  weeklyDay?: number;
  monthlyDay?: number;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

// 更新运势订阅请求
export interface UpdateFortuneSubscriptionRequest {
  enabled?: boolean;
  pushTypes?: string[];
  reminderTime?: string;
  weeklyDay?: number;
  monthlyDay?: number;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

// 获取运势订阅列表请求
export interface GetFortuneSubscriptionsRequest {
  type?: FortuneType;
  enabled?: boolean;
}

// 运势提醒设置接口
export interface FortuneReminderSettings {
  enabled: boolean;
  globalReminderTime: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  pushTypes: string[];
  customSettings: {
    [key in FortuneType]?: {
      enabled: boolean;
      reminderTime: string;
      pushTypes: string[];
    };
  };
}

// 运势服务类
export class FortuneService {
  /**
   * 获取用户运势
   */
  static async getUserFortune(params: GetFortuneRequest): Promise<Fortune> {
    return request({
      url: '/fortune',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 获取用户运势历史
   */
  static async getUserFortuneHistory(
    params: GetFortuneHistoryRequest
  ): Promise<FortuneHistoryResponse> {
    return request({
      url: '/fortune/history',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 获取运势统计
   */
  static async getFortuneStats(): Promise<FortuneStats> {
    return request({
      url: '/fortune/stats',
      method: 'GET',
    });
  }

  /**
   * 获取运势详情
   */
  static async getFortuneDetail(id: number): Promise<Fortune> {
    return request({
      url: `/fortune/${id}`,
      method: 'GET',
    });
  }

  /**
   * 分享运势
   */
  static async shareFortune(id: number): Promise<{ shareUrl: string; shareCode: string }> {
    return request({
      url: `/fortune/${id}/share`,
      method: 'POST',
    });
  }

  /**
   * 删除运势记录
   */
  static async deleteFortune(id: number): Promise<void> {
    return request({
      url: `/fortune/${id}`,
      method: 'DELETE',
    });
  }

  /**
   * 创建运势订阅
   */
  static async createFortuneSubscription(
    data: CreateFortuneSubscriptionRequest
  ): Promise<FortuneSubscription> {
    return request({
      url: '/fortune/subscriptions',
      method: 'POST',
      data,
    });
  }

  /**
   * 获取用户运势订阅列表
   */
  static async getFortuneSubscriptions(
    params?: GetFortuneSubscriptionsRequest
  ): Promise<FortuneSubscription[]> {
    return request({
      url: '/fortune/subscriptions',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 更新运势订阅
   */
  static async updateFortuneSubscription(
    id: number,
    data: UpdateFortuneSubscriptionRequest
  ): Promise<FortuneSubscription> {
    return request({
      url: `/fortune/subscriptions/${id}`,
      method: 'PUT',
      data,
    });
  }

  /**
   * 删除运势订阅
   */
  static async deleteFortuneSubscription(id: number): Promise<void> {
    return request({
      url: `/fortune/subscriptions/${id}`,
      method: 'DELETE',
    });
  }

  /**
   * 获取运势提醒设置
   */
  static async getReminderSettings(): Promise<FortuneReminderSettings> {
    return request({
      url: '/fortune/reminder/settings',
      method: 'GET',
    });
  }

  /**
   * 保存运势提醒设置
   */
  static async saveReminderSettings(
    settings: Partial<FortuneReminderSettings>
  ): Promise<FortuneReminderSettings> {
    return request({
      url: '/fortune/reminder/settings',
      method: 'POST',
      data: settings,
    });
  }

  /**
   * 发送测试提醒
   */
  static async sendTestReminder(
    fortuneType: FortuneType
  ): Promise<{ success: boolean; message: string }> {
    return request({
      url: '/fortune/reminder/test',
      method: 'POST',
      data: { fortuneType },
    });
  }

  // 便捷方法

  /**
   * 获取今日运势
   */
  static async getTodayFortune(): Promise<Fortune> {
    return this.getUserFortune({ type: FortuneType.DAILY });
  }

  /**
   * 获取本周运势
   */
  static async getWeeklyFortune(): Promise<Fortune> {
    return this.getUserFortune({ type: FortuneType.WEEKLY });
  }

  /**
   * 获取本月运势
   */
  static async getMonthlyFortune(): Promise<Fortune> {
    return this.getUserFortune({ type: FortuneType.MONTHLY });
  }

  /**
   * 获取指定日期的运势
   */
  static async getFortuneByDate(
    date: string,
    type: FortuneType = FortuneType.DAILY
  ): Promise<Fortune> {
    return this.getUserFortune({ type, date });
  }

  /**
   * 获取最近的运势历史（默认最近10条）
   */
  static async getRecentFortuneHistory(limit: number = 10): Promise<FortuneHistoryResponse> {
    return this.getUserFortuneHistory({ page: 1, limit });
  }

  /**
   * 获取指定类型的运势历史
   */
  static async getFortuneHistoryByType(
    type: FortuneType,
    page: number = 1,
    limit: number = 10
  ): Promise<FortuneHistoryResponse> {
    return this.getUserFortuneHistory({ type, page, limit });
  }

  /**
   * 获取日期范围内的运势历史
   */
  static async getFortuneHistoryByDateRange(
    startDate: string,
    endDate: string,
    type?: FortuneType,
    page: number = 1,
    limit: number = 10
  ): Promise<FortuneHistoryResponse> {
    return this.getUserFortuneHistory({ type, startDate, endDate, page, limit });
  }

  /**
   * 检查是否已订阅指定类型的运势
   */
  static async isSubscribed(type: FortuneType): Promise<boolean> {
    const subscriptions = await this.getFortuneSubscriptions({ type, enabled: true });
    return subscriptions.length > 0;
  }

  /**
   * 快速订阅运势（使用默认设置）
   */
  static async quickSubscribe(type: FortuneType): Promise<FortuneSubscription> {
    return this.createFortuneSubscription({ type });
  }

  /**
   * 取消订阅指定类型的运势
   */
  static async unsubscribe(type: FortuneType): Promise<void> {
    const subscriptions = await this.getFortuneSubscriptions({ type });
    for (const subscription of subscriptions) {
      await this.deleteFortuneSubscription(subscription.id);
    }
  }

  /**
   * 切换订阅状态
   */
  static async toggleSubscription(type: FortuneType): Promise<boolean> {
    const isCurrentlySubscribed = await this.isSubscribed(type);

    if (isCurrentlySubscribed) {
      await this.unsubscribe(type);
      return false;
    } else {
      await this.quickSubscribe(type);
      return true;
    }
  }

  /**
   * 获取运势趋势数据
   */
  static async getFortuneTrend(
    days: number
  ): Promise<{ success: boolean; data: FortuneTrendStats }> {
    const response = await request({
      url: '/fortune/trend',
      method: 'GET',
      data: { days },
    });
    return response.data;
  }
}

// 导出默认实例
export default FortuneService;
