// import Taro from '@tarojs/taro'
import { request } from './api';

// 塔罗牌相关接口类型定义
export interface TarotCard {
  id: number;
  name: string;
  nameCn: string;
  meaning: string;
  reversedMeaning: string;
  suit: string;
  number: number;
  imageUrl: string;
  active: boolean;
}

export interface TarotSpread {
  id: number;
  name: string;
  nameCn: string;
  cardCount: number;
  description: string;
  difficultyLevel: string;
  positions: string[];
  active: boolean;
}

export interface DivinationRequest {
  question: string;
  spreadId: number;
  userId?: number;
}

export interface CardResult {
  position: number;
  cardId: number;
  isReversed: boolean;
  card: TarotCard;
  meaning: string;
}

export interface DivinationResult {
  id: number;
  question: string;
  spread: TarotSpread;
  cardResults: CardResult[];
  interpretation: {
    summary: string;
    detailed: string;
    advice: string;
  };
  divinationTime: string;
}

export interface HistoryRecord {
  id: number;
  question: string;
  spread: {
    name: string;
    nameCn: string;
  };
  cardResults: CardResult[];
  interpretation: {
    summary: string;
  };
  divinationTime: string;
}

export interface ShareRequest {
  recordId: number;
  platform: string;
}

// 塔罗牌API服务类
class TarotService {
  // 获取所有牌阵列表
  async getSpreads(): Promise<TarotSpread[]> {
    try {
      const response = await request({
        url: '/api/tarot/spreads',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取牌阵列表失败:', error);
      throw error;
    }
  }

  // 获取所有塔罗牌列表
  async getCards(): Promise<TarotCard[]> {
    try {
      const response = await request({
        url: '/api/tarot/cards',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取塔罗牌列表失败:', error);
      throw error;
    }
  }

  // 执行占卜
  async performDivination(data: DivinationRequest): Promise<DivinationResult> {
    try {
      const response = await request({
        url: '/api/tarot/divination',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('执行占卜失败:', error);
      throw error;
    }
  }

  // 获取占卜历史记录
  async getHistory(
    params: {
      page?: number;
      limit?: number;
      userId?: number;
    } = {}
  ): Promise<{
    records: HistoryRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/tarot/history',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      throw error;
    }
  }

  // 获取单个占卜记录详情
  async getRecordDetail(recordId: number): Promise<DivinationResult> {
    try {
      const response = await request({
        url: `/api/tarot/history/${recordId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取占卜详情失败:', error);
      throw error;
    }
  }

  // 分享占卜结果
  async shareResult(data: ShareRequest): Promise<{ shareUrl: string }> {
    try {
      const response = await request({
        url: '/api/tarot/share',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('分享失败:', error);
      throw error;
    }
  }

  // 删除占卜记录
  async deleteRecord(recordId: number): Promise<void> {
    try {
      await request({
        url: `/api/tarot/history/${recordId}`,
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除记录失败:', error);
      throw error;
    }
  }
}

export const tarotService = new TarotService();
export default tarotService;
