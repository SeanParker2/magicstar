import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { BirthChart } from './entities/birth-chart.entity';
import { Planet } from './entities/planet.entity';
import { House } from './entities/house.entity';
import { Aspect } from './entities/aspect.entity';
import { ChartInterpretation } from './entities/chart-interpretation.entity';
import { CreateBirthChartDto } from './dto/create-birth-chart.dto';
import { QueryBirthChartDto } from './dto/query-birth-chart.dto';
import { AstrologyApiService, BirthChartRequest } from './astrology-api.service';
import { AstrologyAlgorithmService } from './astrology-algorithm.service';
import { User } from '../../user/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

export interface BirthChartListResponse {
  charts: BirthChart[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BirthChartDetailResponse {
  chart: BirthChart;
  planets: Planet[];
  houses: House[];
  aspects: Aspect[];
  interpretations: ChartInterpretation[];
}

export interface ShareResponse {
  shareCode: string;
  shareUrl: string;
}

@Injectable()
export class AstrologyService {
  private readonly logger = new Logger(AstrologyService.name);

  constructor(
    @InjectRepository(BirthChart)
    private birthChartRepository: Repository<BirthChart>,
    @InjectRepository(Planet)
    private planetRepository: Repository<Planet>,
    @InjectRepository(House)
    private houseRepository: Repository<House>,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @InjectRepository(ChartInterpretation)
    private interpretationRepository: Repository<ChartInterpretation>,
    private astrologyApiService: AstrologyApiService,
    private algorithmService: AstrologyAlgorithmService,
  ) {}

  /**
   * 创建星盘
   */
  async createBirthChart(userId: number, createDto: CreateBirthChartDto): Promise<BirthChartDetailResponse> {
    try {
      this.logger.log(`Creating birth chart for user ${userId}`);

      // 解析出生日期和时间
      const birthDateTime = new Date(`${createDto.birthDate}T${createDto.birthTime}`);
      
      // 准备API请求数据
      const apiRequest: BirthChartRequest = {
        year: birthDateTime.getFullYear(),
        month: birthDateTime.getMonth() + 1,
        day: birthDateTime.getDate(),
        hour: birthDateTime.getHours(),
        minute: birthDateTime.getMinutes(),
        latitude: createDto.latitude,
        longitude: createDto.longitude,
        timezone: createDto.timezone,
      };

      // 调用占星API获取星盘数据
      const apiResponse = await this.astrologyApiService.generateBirthChart(apiRequest);
      if (!apiResponse.success || !apiResponse.data) {
        throw new BadRequestException('Failed to generate birth chart data');
      }

      // 处理API返回的数据
      const processedPlanets = this.algorithmService.processPlanetData(apiResponse.data.planets || []);
      const processedHouses = this.algorithmService.processHouseData(apiResponse.data.houses || []);
      const processedAspects = this.algorithmService.processAspectData(apiResponse.data.aspects || []);
      const interpretations = this.algorithmService.generateChartInterpretations(
        processedPlanets,
        processedHouses,
        processedAspects
      );

      // 创建星盘记录
      const birthChart = this.birthChartRepository.create({
        userId,
        name: createDto.name,
        birthDate: createDto.birthDate,
        birthTime: createDto.birthTime,
        birthPlace: createDto.birthPlace,
        latitude: createDto.latitude,
        longitude: createDto.longitude,
        timezone: createDto.timezone,
        chartData: apiResponse.data,
        isPublic: createDto.isPublic || false,
        shareCode: this.generateShareCode(),
      });

      const savedChart = await this.birthChartRepository.save(birthChart);

      // 保存行星数据
      const planets = await this.savePlanets(savedChart.id, processedPlanets);

      // 保存宫位数据
      const houses = await this.saveHouses(savedChart.id, processedHouses);

      // 保存相位数据
      const aspects = await this.saveAspects(savedChart.id, processedAspects);

      // 保存解读数据
      const savedInterpretations = await this.saveInterpretations(savedChart.id, interpretations);

      this.logger.log(`Birth chart created successfully with ID: ${savedChart.id}`);

      return {
        chart: savedChart,
        planets,
        houses,
        aspects,
        interpretations: savedInterpretations,
      };
    } catch (error) {
      this.logger.error('Failed to create birth chart:', error);
      throw error;
    }
  }

  /**
   * 获取用户的星盘列表
   */
  async getUserBirthCharts(userId: number, queryDto: QueryBirthChartDto): Promise<BirthChartListResponse> {
    const { page = 1, limit = 10, search, publicOnly } = queryDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<BirthChart> = {
      userId,
    };

    if (publicOnly) {
      where.isPublic = true;
    }

    if (search) {
      where.name = Like(`%${search}%`);
    }

    const [charts, total] = await this.birthChartRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      charts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 获取公开的星盘列表
   */
  async getPublicBirthCharts(queryDto: QueryBirthChartDto): Promise<BirthChartListResponse> {
    const { page = 1, limit = 10, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<BirthChart> = {
      isPublic: true,
    };

    if (search) {
      where.name = Like(`%${search}%`);
    }

    const [charts, total] = await this.birthChartRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      charts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 获取星盘详情
   */
  async getBirthChartDetail(identifier: string, userId?: number): Promise<BirthChartDetailResponse> {
    let chart: BirthChart | null;

    // 尝试通过ID或分享码查找
    if (/^\d+$/.test(identifier)) {
      // 数字ID
      chart = await this.birthChartRepository.findOne({
        where: { id: parseInt(identifier) },
      });
    } else {
      // 分享码
      chart = await this.birthChartRepository.findOne({
        where: { shareCode: identifier },
      });
    }

    if (!chart) {
      throw new NotFoundException('Birth chart not found');
    }

    // 检查访问权限
    if (!chart.isPublic && chart.userId !== userId) {
      throw new ForbiddenException('Access denied to this birth chart');
    }

    // 获取相关数据
    const [planets, houses, aspects, interpretations] = await Promise.all([
      this.planetRepository.find({ where: { birthChartId: chart.id } }),
      this.houseRepository.find({ where: { birthChartId: chart.id } }),
      this.aspectRepository.find({ where: { birthChartId: chart.id } }),
      this.interpretationRepository.find({ 
        where: { birthChartId: chart.id },
        order: { importance: 'DESC' },
      }),
    ]);

    return {
      chart,
      planets,
      houses,
      aspects,
      interpretations,
    };
  }

  /**
   * 更新星盘
   */
  async updateBirthChart(chartId: number, userId: number, updateDto: Partial<CreateBirthChartDto>): Promise<BirthChart> {
    const chart = await this.birthChartRepository.findOne({
      where: { id: chartId, userId },
    });

    if (!chart) {
      throw new NotFoundException('Birth chart not found');
    }

    // 更新基本信息
    Object.assign(chart, updateDto);
    
    // 如果更新了出生信息，需要重新计算星盘
    if (updateDto.birthDate || updateDto.birthTime || updateDto.latitude || updateDto.longitude) {
      await this.recalculateChart(chart);
    }

    return await this.birthChartRepository.save(chart);
  }

  /**
   * 删除星盘
   */
  async deleteBirthChart(chartId: number, userId: number): Promise<void> {
    const chart = await this.birthChartRepository.findOne({
      where: { id: chartId, userId },
    });

    if (!chart) {
      throw new NotFoundException('Birth chart not found');
    }

    // 删除相关数据
    await Promise.all([
      this.planetRepository.delete({ birthChartId: chartId }),
      this.houseRepository.delete({ birthChartId: chartId }),
      this.aspectRepository.delete({ birthChartId: chartId }),
      this.interpretationRepository.delete({ birthChartId: chartId }),
    ]);

    // 删除星盘
    await this.birthChartRepository.delete(chartId);

    this.logger.log(`Birth chart ${chartId} deleted successfully`);
  }

  /**
   * 生成分享链接
   */
  async generateShareLink(chartId: number, userId: number, regenerate = false): Promise<ShareResponse> {
    const chart = await this.birthChartRepository.findOne({
      where: { id: chartId, userId },
    });

    if (!chart) {
      throw new NotFoundException('Birth chart not found');
    }

    if (regenerate || !chart.shareCode) {
      chart.shareCode = this.generateShareCode();
      await this.birthChartRepository.save(chart);
    }

    return {
      shareCode: chart.shareCode,
      shareUrl: `${process.env.FRONTEND_URL}/astrology/chart/${chart.shareCode}`,
    };
  }

  /**
   * 计算星盘兼容性
   */
  async calculateCompatibility(chart1Id: number, chart2Id: number, userId?: number): Promise<{ score: number; analysis: string }> {
    const [chart1Detail, chart2Detail] = await Promise.all([
      this.getBirthChartDetail(chart1Id.toString(), userId),
      this.getBirthChartDetail(chart2Id.toString(), userId),
    ]);

    const score = this.algorithmService.calculateCompatibility(
      chart1Detail.planets.map(p => ({
        name: p.name,
        sign: p.sign,
        degree: p.degree,
        house: p.houseNumber,
        retrograde: p.isRetrograde,
      })),
      chart2Detail.planets.map(p => ({
        name: p.name,
        sign: p.sign,
        degree: p.degree,
        house: p.houseNumber,
        retrograde: p.isRetrograde,
      }))
    );

    const analysis = this.generateCompatibilityAnalysis(score);

    return { score, analysis };
  }

  /**
   * 保存行星数据
   */
  private async savePlanets(chartId: number, planetsData: any[]): Promise<Planet[]> {
    const planets = planetsData.map(planetData => 
      this.planetRepository.create({
        birthChartId: chartId,
        type: planetData?.name?.toLowerCase() as any,
        name: planetData?.name || '',
        sign: planetData?.sign?.toLowerCase() as any,
        degree: planetData?.degree || 0,
        houseNumber: planetData?.house || 1,
        isRetrograde: planetData?.retrograde || false,
        symbol: planetData?.symbol || '',
        description: `${planetData?.name || ''}位于${planetData?.sign || ''}${planetData?.house || ''}宫`,
      })
    );

    return await this.planetRepository.save(planets);
  }

  /**
   * 保存宫位数据
   */
  private async saveHouses(chartId: number, housesData: any[]): Promise<House[]> {
    const houses = housesData.map(houseData => 
      this.houseRepository.create({
        birthChartId: chartId,
        houseNumber: houseData?.number || 1,
        name: `第${houseData?.number || 1}宫`,
        cuspSign: houseData?.sign || '',
        cuspDegree: houseData?.degree || 0,
        size: houseData?.size || 30,
        description: `第${houseData?.number || 1}宫宫头位于${houseData?.sign || ''}`,
        keywords: this.getHouseKeywords(houseData?.number || 1),
      })
    );

    return await this.houseRepository.save(houses);
  }

  /**
   * 保存相位数据
   */
  private async saveAspects(chartId: number, aspectsData: any[]): Promise<Aspect[]> {
    const aspects = aspectsData.map(aspectData => 
      this.aspectRepository.create({
        birthChartId: chartId,
        planet1: aspectData?.planet1?.toLowerCase() as any,
        planet2: aspectData?.planet2?.toLowerCase() as any,
        type: aspectData?.type?.toLowerCase() as any,
        name: `${aspectData?.planet1 || ''}${aspectData?.type || ''}${aspectData?.planet2 || ''}`,
        angle: aspectData?.angle || 0,
        orb: aspectData?.orb || 0,
        quality: aspectData?.quality || 'major' as any,
        strength: this.calculateAspectStrength(aspectData?.orb || 0),
        description: `${aspectData?.planet1 || ''}与${aspectData?.planet2 || ''}形成${aspectData?.type || ''}`,
        influence: this.getAspectInfluence(aspectData),
      })
    );

    return await this.aspectRepository.save(aspects);
  }

  /**
   * 保存解读数据
   */
  private async saveInterpretations(chartId: number, interpretationsData: any[]): Promise<ChartInterpretation[]> {
    const interpretations = interpretationsData.map(interpData => 
      this.interpretationRepository.create({
        birthChartId: chartId,
        type: interpData?.type?.toLowerCase() as any,
        title: interpData?.title || '',
        content: interpData?.content || '',
        keywords: Array.isArray(interpData?.keywords) ? interpData.keywords.join(',') : '',
        importance: interpData?.importance || 1,
        source: 'system',
        isAiGenerated: true,
        interpretationData: interpData,
      })
    );

    return await this.interpretationRepository.save(interpretations);
  }

  /**
   * 重新计算星盘
   */
  private async recalculateChart(chart: BirthChart): Promise<void> {
    // 删除关联数据
    await Promise.all([
      this.planetRepository.delete({ birthChartId: chart.id }),
      this.houseRepository.delete({ birthChartId: chart.id }),
      this.aspectRepository.delete({ birthChartId: chart.id }),
      this.interpretationRepository.delete({ birthChartId: chart.id }),
    ]);

    // 重新计算
    const birthDateTime = new Date(`${chart.birthDate}T${chart.birthTime}`);
    const apiRequest: BirthChartRequest = {
      year: birthDateTime.getFullYear(),
      month: birthDateTime.getMonth() + 1,
      day: birthDateTime.getDate(),
      hour: birthDateTime.getHours(),
      minute: birthDateTime.getMinutes(),
      latitude: chart.latitude,
      longitude: chart.longitude,
      timezone: chart.timezone,
    };

    const apiResponse = await this.astrologyApiService.generateBirthChart(apiRequest);
    if (apiResponse.success && apiResponse.data) {
      chart.chartData = apiResponse.data;
      
      const processedPlanets = this.algorithmService.processPlanetData(apiResponse.data.planets || []);
      const processedHouses = this.algorithmService.processHouseData(apiResponse.data.houses || []);
      const processedAspects = this.algorithmService.processAspectData(apiResponse.data.aspects || []);
      const interpretations = this.algorithmService.generateChartInterpretations(
        processedPlanets,
        processedHouses,
        processedAspects
      );

      await Promise.all([
        this.savePlanets(chart.id, processedPlanets),
        this.saveHouses(chart.id, processedHouses),
        this.saveAspects(chart.id, processedAspects),
        this.saveInterpretations(chart.id, interpretations),
      ]);
    }
  }

  /**
   * 生成分享码
   */
  private generateShareCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12);
  }

  /**
   * 获取宫位关键词
   */
  private getHouseKeywords(houseNumber: number): string {
    const keywords: Record<number, string> = {
      1: '自我,外表,第一印象',
      2: '金钱,价值观,物质',
      3: '沟通,兄弟姐妹,短途旅行',
      4: '家庭,根基,内心安全',
      5: '创造,恋爱,娱乐',
      6: '工作,健康,日常',
      7: '伙伴,婚姻,合作',
      8: '转化,共同资源,神秘',
      9: '哲学,高等教育,远行',
      10: '事业,声誉,社会地位',
      11: '友谊,团体,理想',
      12: '潜意识,精神,隐藏',
    };
    return keywords[houseNumber] || '';
  }

  /**
   * 计算相位强度
   */
  private calculateAspectStrength(orb: number): number {
    // 容许度越小，相位越强
    return Math.max(1, Math.round((8 - orb) * 10) / 10);
  }

  /**
   * 获取相位影响
   */
  private getAspectInfluence(aspectData: any): string {
    const influences: Record<string, string> = {
      'harmonious': '带来和谐与支持的能量',
      'challenging': '带来挑战与成长的机会',
      'neutral': '带来融合与强化的能量',
    };
    return influences[aspectData?.quality] || '带来特殊的能量互动';
  }

  /**
   * 生成兼容性分析
   */
  private generateCompatibilityAnalysis(score: number): string {
    if (score >= 2) {
      return '你们之间有很强的兼容性，能够相互理解和支持，关系和谐稳定。';
    } else if (score >= 1) {
      return '你们之间有良好的兼容性，虽然可能有些小摩擦，但总体上能够相处愉快。';
    } else if (score >= 0) {
      return '你们之间的兼容性一般，需要更多的理解和包容来维持关系。';
    } else if (score >= -1) {
      return '你们之间存在一些挑战，但这些挑战也可能带来成长和深化关系的机会。';
    } else {
      return '你们之间的差异较大，需要付出更多努力来理解和适应彼此。';
    }
  }
}