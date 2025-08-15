import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FortuneDataService } from './fortune-data.service';
import { FortuneSeedService } from './fortune-seed.service';

@ApiTags('运势管理')
@Controller('fortune/admin')
export class FortuneAdminController {
  constructor(
    private readonly fortuneDataService: FortuneDataService,
    private readonly fortuneSeedService: FortuneSeedService,
  ) {}

  @Post('seed')
  @ApiOperation({ summary: '初始化运势模板数据' })
  @ApiResponse({ status: 201, description: '初始化成功' })
  async seedFortuneTemplates() {
    await this.fortuneSeedService.seedFortuneTemplates();
    return { message: '运势模板数据初始化成功' };
  }

  @Post('reset')
  @ApiOperation({ summary: '重置运势模板数据' })
  @ApiResponse({ status: 201, description: '重置成功' })
  async resetFortuneTemplates() {
    await this.fortuneSeedService.resetFortuneTemplates();
    return { message: '运势模板数据重置成功' };
  }

  @Delete('cache')
  @ApiOperation({ summary: '清除运势缓存' })
  @ApiResponse({ status: 200, description: '缓存清除成功' })
  async clearCache() {
    await this.fortuneDataService.clearCache();
    return { message: '运势缓存清除成功' };
  }

  @Post('cache/refresh')
  @ApiOperation({ summary: '刷新运势缓存' })
  @ApiResponse({ status: 201, description: '缓存刷新成功' })
  async refreshCache() {
    await this.fortuneDataService.refreshCache();
    return { message: '运势缓存刷新成功' };
  }

  @Get('cache/stats')
  @ApiOperation({ summary: '获取缓存统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCacheStats() {
    const stats = await this.fortuneDataService.getCacheStats();
    return {
      message: '获取缓存统计信息成功',
      data: stats,
    };
  }

  @Get('templates/count')
  @ApiOperation({ summary: '获取运势模板数量统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTemplateCount() {
    const stats = await this.fortuneDataService.getTemplateStats();
    return {
      message: '获取模板统计信息成功',
      data: stats,
    };
  }
}