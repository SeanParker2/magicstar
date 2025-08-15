import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface BirthChartRequest {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface AstrologyApiResponse {
  success: boolean;
  data?: {
    planets: any[];
    houses: any[];
    aspects: any[];
    cusps: any[];
    [key: string]: any;
  };
  error?: string;
}

@Injectable()
export class AstrologyApiService {
  private readonly logger = new Logger(AstrologyApiService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string | undefined;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    this.apiKey = this.configService.get<string>('thirdParty.astrology.apiKey');
    this.apiUrl = this.configService.get<string>('thirdParty.astrology.apiUrl');

  }

  /**
   * 生成星盘数据
   */
  async generateBirthChart(request: BirthChartRequest): Promise<AstrologyApiResponse> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Astrology API key not configured, using mock data');
        return this.getMockBirthChartData(request);
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(`${this.apiUrl}/birth-chart`, {
        birth_date: `${request.year}-${String(request.month).padStart(2, '0')}-${String(request.day).padStart(2, '0')}`,
        birth_time: `${String(request.hour).padStart(2, '0')}:${String(request.minute).padStart(2, '0')}:00`,
        latitude: request.latitude,
        longitude: request.longitude,
        timezone: request.timezone,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        })
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to generate birth chart:', error);
      
      if (error.response?.status === 401) {
        throw new HttpException('Invalid API credentials', HttpStatus.UNAUTHORIZED);
      } else if (error.response?.status === 429) {
        throw new HttpException('API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      } else if (error.code === 'ECONNABORTED') {
        throw new HttpException('API request timeout', HttpStatus.REQUEST_TIMEOUT);
      }

      // 如果API调用失败，返回模拟数据
      this.logger.warn('API call failed, falling back to mock data');
      return this.getMockBirthChartData(request);
    }
  }

  /**
   * 获取行星位置
   */
  async getPlanetPositions(request: BirthChartRequest): Promise<any[]> {
    try {
      const chartData = await this.generateBirthChart(request);
      return chartData.data?.planets || [];
    } catch (error) {
      this.logger.error('Failed to get planet positions:', error);
      return [];
    }
  }

  /**
   * 获取宫位信息
   */
  async getHousePositions(request: BirthChartRequest): Promise<any[]> {
    try {
      const chartData = await this.generateBirthChart(request);
      return chartData.data?.houses || [];
    } catch (error) {
      this.logger.error('Failed to get house positions:', error);
      return [];
    }
  }

  /**
   * 获取相位信息
   */
  async getAspects(request: BirthChartRequest): Promise<any[]> {
    try {
      const chartData = await this.generateBirthChart(request);
      return chartData.data?.aspects || [];
    } catch (error) {
      this.logger.error('Failed to get aspects:', error);
      return [];
    }
  }

  /**
   * 模拟星盘数据（用于开发和测试）
   */
  private getMockBirthChartData(request: BirthChartRequest): AstrologyApiResponse {
    return {
      success: true,
      data: {
        planets: [
          {
            name: 'Sun',
            sign: 'Capricorn',
            degree: 10.5,
            house: 1,
            retrograde: false,
          },
          {
            name: 'Moon',
            sign: 'Cancer',
            degree: 25.3,
            house: 7,
            retrograde: false,
          },
          {
            name: 'Mercury',
            sign: 'Sagittarius',
            degree: 28.7,
            house: 12,
            retrograde: true,
          },
          {
            name: 'Venus',
            sign: 'Aquarius',
            degree: 15.2,
            house: 2,
            retrograde: false,
          },
          {
            name: 'Mars',
            sign: 'Aries',
            degree: 8.9,
            house: 4,
            retrograde: false,
          },
        ],
        houses: [
          { number: 1, sign: 'Capricorn', degree: 5.0 },
          { number: 2, sign: 'Aquarius', degree: 10.0 },
          { number: 3, sign: 'Pisces', degree: 15.0 },
          { number: 4, sign: 'Aries', degree: 20.0 },
          { number: 5, sign: 'Taurus', degree: 25.0 },
          { number: 6, sign: 'Gemini', degree: 30.0 },
          { number: 7, sign: 'Cancer', degree: 5.0 },
          { number: 8, sign: 'Leo', degree: 10.0 },
          { number: 9, sign: 'Virgo', degree: 15.0 },
          { number: 10, sign: 'Libra', degree: 20.0 },
          { number: 11, sign: 'Scorpio', degree: 25.0 },
          { number: 12, sign: 'Sagittarius', degree: 30.0 },
        ],
        aspects: [
          {
            planet1: 'Sun',
            planet2: 'Moon',
            type: 'opposition',
            angle: 180.0,
            orb: 2.5,
          },
          {
            planet1: 'Venus',
            planet2: 'Mars',
            type: 'trine',
            angle: 120.0,
            orb: 1.8,
          },
        ],
        cusps: [
          { house: 1, sign: 'Capricorn', degree: 5.0 },
          { house: 2, sign: 'Aquarius', degree: 10.0 },
          { house: 3, sign: 'Pisces', degree: 15.0 },
          { house: 4, sign: 'Aries', degree: 20.0 },
          { house: 5, sign: 'Taurus', degree: 25.0 },
          { house: 6, sign: 'Gemini', degree: 30.0 },
          { house: 7, sign: 'Cancer', degree: 5.0 },
          { house: 8, sign: 'Leo', degree: 10.0 },
          { house: 9, sign: 'Virgo', degree: 15.0 },
          { house: 10, sign: 'Libra', degree: 20.0 },
          { house: 11, sign: 'Scorpio', degree: 25.0 },
          { house: 12, sign: 'Sagittarius', degree: 30.0 },
        ],
      },
    };
  }

  /**
   * 检查API连接状态
   */
  async checkApiStatus(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }
      
      const response: AxiosResponse = await firstValueFrom(
         this.httpService.get(`${this.apiUrl}/status`, {
           headers: {
             'Authorization': `Bearer ${this.apiKey}`,
           },
           timeout: 10000,
         })
       );
       return response.status === 200;
    } catch (error) {
      this.logger.error('API status check failed:', error);
      return false;
    }
  }
}