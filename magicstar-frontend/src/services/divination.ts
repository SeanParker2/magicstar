import { request } from './api';

// 塔罗牌相关接口类型定义

// 塔罗牌实体
export interface TarotCard {
  id: number;
  name: string;
  nameCn: string;
  suit: string;
  number: number;
  arcana: 'major' | 'minor';
  uprightMeaning: string;
  reversedMeaning: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  description: string;
  imageUrl: string;
  symbolism: string;
  element?: string;
  planet?: string;
  zodiacSign?: string;
  numerology?: number;
  createdAt: string;
  updatedAt: string;
}

// 塔罗牌阵
export interface TarotSpread {
  id: number;
  name: string;
  nameCn: string;
  description: string;
  cardCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  imageUrl?: string;
  positionsConfig: {
    position: number;
    name: string;
    meaning: string;
    description: string;
  }[];
  instructions: string;
  isRecommended: boolean;
  popularity: number;
  createdAt: string;
  updatedAt: string;
}

// 塔罗占卜记录
export interface TarotReading {
  id: number;
  userId: number;
  spreadId: number;
  spread: TarotSpread;
  question: string;
  drawnCards: {
    position: number;
    cardId: number;
    isReversed: boolean;
    card: TarotCard;
  }[];
  overallInterpretation: string;
  detailedInterpretation: {
    position: number;
    positionName: string;
    cardInterpretation: string;
    advice: string;
  }[];
  summary: string;
  advice?: string;
  isPublic: boolean;
  shareCode?: string;
  rating?: number;
  feedback?: string;
  readingTime: string;
  createdAt: string;
  updatedAt: string;
}

// 创建塔罗占卜请求
export interface CreateTarotReadingRequest {
  spreadId: number;
  question: string;
  isPublic?: boolean;
}

// 塔罗占卜结果
export interface TarotReadingResult {
  id: number;
  spread: {
    id: number;
    name: string;
    nameCn: string;
    cardCount: number;
  };
  question: string;
  drawnCards: {
    position: number;
    cardId: number;
    isReversed: boolean;
    cardName: string;
    cardNameCn: string;
    meaning: string;
    imageUrl: string;
  }[];
  overallInterpretation: string;
  detailedInterpretation: {
    position: number;
    positionName: string;
    cardInterpretation: string;
    advice: string;
  }[];
  summary: string;
  advice?: string;
  readingTime: Date;
}

// 查询塔罗牌请求
export interface QueryTarotCardsRequest {
  arcana?: 'major' | 'minor';
  suit?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// 查询牌阵请求
export interface QueryTarotSpreadsRequest {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  cardCount?: number;
  recommended?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// 查询占卜历史请求
export interface QueryTarotReadingsRequest {
  spreadId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// 占卜统计
export interface TarotReadingStats {
  totalReadings: number;
  favoriteSpread: {
    id: number;
    name: string;
    count: number;
  };
  readingsByMonth: {
    month: string;
    count: number;
  }[];
  averageRating: number;
  mostUsedCards: {
    cardId: number;
    cardName: string;
    count: number;
  }[];
}

// 星盘相关接口类型定义

// 出生星盘
export interface BirthChart {
  id: number;
  userId: number;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isPublic: boolean;
  shareCode?: string;
  chartData: {
    planets: Planet[];
    houses: House[];
    aspects: Aspect[];
  };
  interpretation?: ChartInterpretation;
  createdAt: string;
  updatedAt: string;
}

// 行星信息
export interface Planet {
  id: number;
  name: string;
  symbol: string;
  longitude: number;
  latitude: number;
  speed: number;
  sign: string;
  house: number;
  isRetrograde: boolean;
  meaning: string;
  influence: string;
}

// 宫位信息
export interface House {
  id: number;
  number: number;
  sign: string;
  longitude: number;
  meaning: string;
  influence: string;
}

// 相位信息
export interface Aspect {
  id: number;
  planet1: string;
  planet2: string;
  type: string;
  angle: number;
  orb: number;
  isApplying: boolean;
  meaning: string;
  influence: string;
}

// 星盘解读
export interface ChartInterpretation {
  id: number;
  chartId: number;
  overallAnalysis: string;
  personalityTraits: string[];
  strengths: string[];
  challenges: string[];
  careerGuidance: string;
  relationshipInsights: string;
  lifeThemes: string[];
  recommendations: string[];
  createdAt: string;
}

// 创建星盘请求
export interface CreateBirthChartRequest {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isPublic?: boolean;
}

// 查询星盘请求
export interface QueryBirthChartRequest {
  page?: number;
  limit?: number;
  search?: string;
  publicOnly?: boolean;
}

// 星盘兼容性
export interface ChartCompatibility {
  chart1Id: number;
  chart2Id: number;
  overallScore: number;
  compatibilityAspects: {
    category: string;
    score: number;
    description: string;
  }[];
  strengths: string[];
  challenges: string[];
  advice: string[];
  detailedAnalysis: string;
}

// 行星信息响应
export interface PlanetInfo {
  name: string;
  symbol: string;
  meaning: string;
  influence: string;
  keywords: string[];
  element?: string;
  rulership: string[];
}

// 星座信息响应
export interface SignInfo {
  name: string;
  symbol: string;
  element: string;
  quality: string;
  ruler: string;
  meaning: string;
  traits: string[];
  keywords: string[];
}

// 宫位信息响应
export interface HouseInfo {
  number: number;
  name: string;
  meaning: string;
  themes: string[];
  keywords: string[];
  naturalSign: string;
  naturalRuler: string;
}

// 占卜服务类
export class DivinationService {
  // 塔罗牌相关方法

  /**
   * 获取塔罗牌列表
   */
  static async getAllCards(params?: QueryTarotCardsRequest): Promise<TarotCard[]> {
    return request({
      url: '/tarot/cards',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 根据ID获取塔罗牌详情
   */
  static async getCardById(id: number): Promise<TarotCard> {
    return request({
      url: `/tarot/cards/${id}`,
      method: 'GET',
    });
  }

  /**
   * 获取塔罗牌阵列表
   */
  static async getAllSpreads(params?: QueryTarotSpreadsRequest): Promise<TarotSpread[]> {
    return request({
      url: '/tarot/spreads',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 获取推荐牌阵
   */
  static async getRecommendedSpreads(difficulty?: string): Promise<TarotSpread[]> {
    return request({
      url: '/tarot/spreads/recommended',
      method: 'GET',
      data: { difficulty },
    });
  }

  /**
   * 根据ID获取牌阵详情
   */
  static async getSpreadById(id: number): Promise<TarotSpread> {
    return request({
      url: `/tarot/spreads/${id}`,
      method: 'GET',
    });
  }

  /**
   * 进行塔罗占卜
   */
  static async performReading(data: CreateTarotReadingRequest): Promise<TarotReadingResult> {
    return request({
      url: '/tarot/reading',
      method: 'POST',
      data,
    });
  }

  /**
   * 获取用户占卜历史
   */
  static async getUserReadings(params?: QueryTarotReadingsRequest): Promise<TarotReading[]> {
    return request({
      url: '/tarot/readings',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 获取用户占卜统计
   */
  static async getReadingStats(): Promise<TarotReadingStats> {
    return request({
      url: '/tarot/readings/stats',
      method: 'GET',
    });
  }

  /**
   * 根据ID获取占卜记录详情
   */
  static async getReadingById(id: number): Promise<TarotReading> {
    return request({
      url: `/tarot/readings/${id}`,
      method: 'GET',
    });
  }

  /**
   * 分享占卜记录
   */
  static async shareReading(id: number): Promise<{ message: string }> {
    return request({
      url: `/tarot/readings/${id}/share`,
      method: 'POST',
    });
  }

  /**
   * 评价占卜记录
   */
  static async rateReading(
    id: number,
    rating: number,
    feedback?: string
  ): Promise<{ message: string }> {
    return request({
      url: `/tarot/readings/${id}/rate`,
      method: 'POST',
      data: { rating, feedback },
    });
  }

  // 星盘相关方法

  /**
   * 创建星盘
   */
  static async createBirthChart(data: CreateBirthChartRequest): Promise<BirthChart> {
    return request({
      url: '/astrology/birth-chart',
      method: 'POST',
      data,
    });
  }

  /**
   * 获取我的星盘列表
   */
  static async getMyBirthCharts(params?: QueryBirthChartRequest): Promise<{
    data: BirthChart[];
    total: number;
    page: number;
    limit: number;
  }> {
    return request({
      url: '/astrology/birth-chart/my',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 获取公开的星盘列表
   */
  static async getPublicBirthCharts(params?: QueryBirthChartRequest): Promise<{
    data: BirthChart[];
    total: number;
    page: number;
    limit: number;
  }> {
    return request({
      url: '/astrology/birth-chart/public',
      method: 'GET',
      data: params,
    });
  }

  /**
   * 获取星盘详情
   */
  static async getBirthChartDetail(identifier: string): Promise<BirthChart> {
    return request({
      url: `/astrology/birth-chart/${identifier}`,
      method: 'GET',
    });
  }

  /**
   * 更新星盘
   */
  static async updateBirthChart(
    id: number,
    data: Partial<CreateBirthChartRequest>
  ): Promise<BirthChart> {
    return request({
      url: `/astrology/birth-chart/${id}`,
      method: 'PUT',
      data,
    });
  }

  /**
   * 删除星盘
   */
  static async deleteBirthChart(id: number): Promise<{ message: string }> {
    return request({
      url: `/astrology/birth-chart/${id}`,
      method: 'DELETE',
    });
  }

  /**
   * 生成分享链接
   */
  static async generateShareLink(
    id: number,
    regenerate?: boolean
  ): Promise<{ shareUrl: string; shareCode: string }> {
    return request({
      url: `/astrology/birth-chart/${id}/share`,
      method: 'POST',
      data: { regenerate },
    });
  }

  /**
   * 计算星盘兼容性
   */
  static async calculateCompatibility(
    chart1Id: number,
    chart2Id: number
  ): Promise<ChartCompatibility> {
    return request({
      url: '/astrology/compatibility',
      method: 'POST',
      data: { chart1Id, chart2Id },
    });
  }

  /**
   * 获取行星信息
   */
  static async getPlanetsInfo(): Promise<PlanetInfo[]> {
    return request({
      url: '/astrology/planets',
      method: 'GET',
    });
  }

  /**
   * 获取星座信息
   */
  static async getSignsInfo(): Promise<SignInfo[]> {
    return request({
      url: '/astrology/signs',
      method: 'GET',
    });
  }

  /**
   * 获取宫位信息
   */
  static async getHousesInfo(): Promise<HouseInfo[]> {
    return request({
      url: '/astrology/houses',
      method: 'GET',
    });
  }

  // 便捷方法

  /**
   * 获取初学者推荐牌阵
   */
  static async getBeginnerSpreads(): Promise<TarotSpread[]> {
    return this.getRecommendedSpreads('beginner');
  }

  /**
   * 获取最受欢迎的牌阵
   */
  static async getPopularSpreads(): Promise<TarotSpread[]> {
    return this.getAllSpreads({ recommended: true });
  }

  /**
   * 搜索塔罗牌
   */
  static async searchCards(keyword: string): Promise<TarotCard[]> {
    return this.getAllCards({ search: keyword });
  }

  /**
   * 获取大阿卡纳牌
   */
  static async getMajorArcana(): Promise<TarotCard[]> {
    return this.getAllCards({ arcana: 'major' });
  }

  /**
   * 获取小阿卡纳牌
   */
  static async getMinorArcana(suit?: string): Promise<TarotCard[]> {
    return this.getAllCards({ arcana: 'minor', suit });
  }

  /**
   * 获取最近的占卜记录
   */
  static async getRecentReadings(limit: number = 10): Promise<TarotReading[]> {
    return this.getUserReadings({ page: 1, limit });
  }

  /**
   * 获取指定牌阵的占卜历史
   */
  static async getReadingsBySpread(spreadId: number): Promise<TarotReading[]> {
    return this.getUserReadings({ spreadId });
  }

  /**
   * 快速占卜（使用默认三张牌牌阵）
   */
  static async quickReading(question: string): Promise<TarotReadingResult> {
    // 假设ID为1的是三张牌牌阵
    return this.performReading({ spreadId: 1, question });
  }

  /**
   * 创建个人星盘
   */
  static async createPersonalChart(
    name: string,
    birthDate: string,
    birthTime: string,
    birthPlace: string,
    latitude: number,
    longitude: number,
    timezone: string = 'Asia/Shanghai'
  ): Promise<BirthChart> {
    return this.createBirthChart({
      name,
      birthDate,
      birthTime,
      birthPlace,
      latitude,
      longitude,
      timezone,
      isPublic: false,
    });
  }

  /**
   * 获取我的第一个星盘
   */
  static async getMyFirstChart(): Promise<BirthChart | null> {
    const result = await this.getMyBirthCharts({ page: 1, limit: 1 });
    return result.data.length > 0 ? result.data[0] : null;
  }

  /**
   * 检查是否有星盘
   */
  static async hasCharts(): Promise<boolean> {
    const result = await this.getMyBirthCharts({ page: 1, limit: 1 });
    return result.total > 0;
  }

  /**
   * 搜索公开星盘
   */
  static async searchPublicCharts(keyword: string): Promise<BirthChart[]> {
    const result = await this.getPublicBirthCharts({ search: keyword });
    return result.data;
  }

  /**
   * 计算两个星盘的兼容性
   */
  static async checkCompatibility(
    myChartId: number,
    otherChartId: number
  ): Promise<ChartCompatibility> {
    return this.calculateCompatibility(myChartId, otherChartId);
  }
}

// 导出默认实例
export default DivinationService;
