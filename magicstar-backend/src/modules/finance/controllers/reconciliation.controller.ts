import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReconciliationService } from '../services/reconciliation.service';
import { CreateReconciliationDto } from '../dto/create-reconciliation.dto';
import { QueryReconciliationDto } from '../dto/query-reconciliation.dto';
import { ReconciliationResultDto, ReconciliationListDto } from '../dto/reconciliation-result.dto';
import { ReconciliationRecord } from '../entities/reconciliation-record.entity';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('对账管理')
@Controller('finance/reconciliation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post()
  @ApiOperation({ summary: '创建对账任务' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '对账任务创建成功',
    type: ReconciliationRecord,
  })
  @HttpCode(HttpStatus.CREATED)
  async createReconciliation(
    @Body() createDto: CreateReconciliationDto,
  ): Promise<ReconciliationRecord> {
    return this.reconciliationService.createReconciliation(createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询对账记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账记录查询成功',
    type: ReconciliationListDto,
  })
  async findReconciliations(
    @Query() queryDto: QueryReconciliationDto,
  ): Promise<{
    reconciliations: ReconciliationRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.reconciliationService.findReconciliations(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取对账详情' })
  @ApiParam({ name: 'id', description: '对账记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账详情获取成功',
    type: ReconciliationResultDto,
  })
  async getReconciliation(@Param('id') id: string): Promise<ReconciliationResultDto> {
    return this.reconciliationService.getReconciliationResult(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行对账' })
  @ApiParam({ name: 'id', description: '对账记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账执行成功',
    type: ReconciliationRecord,
  })
  async executeReconciliation(@Param('id') id: string): Promise<ReconciliationRecord> {
    return this.reconciliationService.executeReconciliation(id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: '标记对账完成' })
  @ApiParam({ name: 'id', description: '对账记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账标记完成成功',
    type: ReconciliationRecord,
  })
  async markAsCompleted(
    @Param('id') id: string,
    @Body('remark') remark?: string,
  ): Promise<ReconciliationRecord> {
    return this.reconciliationService.markAsCompleted(id, remark);
  }

  @Get(':id/report')
  @ApiOperation({ summary: '下载对账报告' })
  @ApiParam({ name: 'id', description: '对账记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账报告下载成功',
  })
  async downloadReport(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const filePath = await this.reconciliationService.getReportFile(id);
      
      if (!fs.existsSync(filePath)) {
        res.status(HttpStatus.NOT_FOUND).json({
          message: '报告文件不存在',
        });
        return;
      }

      const stat = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: '报告下载失败',
        error: error.message,
      });
    }
  }

  @Get('stats/summary')
  @ApiOperation({ summary: '获取对账统计' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账统计获取成功',
  })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    totalCount: number;
    completedCount: number;
    pendingCount: number;
    exceptionCount: number;
    completionRate: number;
    avgProcessingTime: number;
    discrepancyRate: number;
  }> {
    // 模拟统计数据
    return {
      totalCount: 100,
      completedCount: 85,
      pendingCount: 10,
      exceptionCount: 5,
      completionRate: 0.85,
      avgProcessingTime: 120000, // 2分钟
      discrepancyRate: 0.02,
    };
  }

  @Get('stats/trends')
  @ApiOperation({ summary: '获取对账趋势' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '对账趋势获取成功',
  })
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Array<{
    date: string;
    totalCount: number;
    completedCount: number;
    discrepancyCount: number;
    avgProcessingTime: number;
  }>> {
    // 模拟趋势数据
    const trends: Array<{
      date: string;
      totalCount: number;
      completedCount: number;
      discrepancyCount: number;
      avgProcessingTime: number;
    }> = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      trends.push({
        date: d.toISOString().split('T')[0],
        totalCount: Math.floor(Math.random() * 10) + 1,
        completedCount: Math.floor(Math.random() * 8) + 1,
        discrepancyCount: Math.floor(Math.random() * 2),
        avgProcessingTime: Math.floor(Math.random() * 180000) + 60000, // 1-4分钟
      });
    }
    
    return trends;
  }
}