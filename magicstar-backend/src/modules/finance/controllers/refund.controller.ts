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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RefundService } from '../services/refund.service';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { QueryRefundDto } from '../dto/query-refund.dto';
import { RefundStatsDto, RefundOverviewDto, RefundTrendDto } from '../dto/refund-stats.dto';
import { RefundRecord } from '../entities/refund-record.entity';

@ApiTags('退款管理')
@Controller('finance/refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '退款申请成功',
    type: RefundRecord,
  })
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Body() createDto: CreateRefundDto,
  ): Promise<RefundRecord> {
    return this.refundService.createRefund(createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询退款记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款记录查询成功',
  })
  async findRefunds(
    @Query() queryDto: QueryRefundDto,
  ): Promise<{
    refunds: RefundRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.refundService.findRefunds(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取退款详情' })
  @ApiParam({ name: 'id', description: '退款记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款详情获取成功',
    type: RefundRecord,
  })
  async getRefund(@Param('id') id: string): Promise<RefundRecord> {
    return this.refundService.getRefundById(id);
  }

  @Patch(':id/process')
  @ApiOperation({ summary: '处理退款' })
  @ApiParam({ name: 'id', description: '退款记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款处理成功',
    type: RefundRecord,
  })
  async processRefund(@Param('id') id: string): Promise<RefundRecord> {
    return this.refundService.processRefund(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '取消退款' })
  @ApiParam({ name: 'id', description: '退款记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款取消成功',
    type: RefundRecord,
  })
  async cancelRefund(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<RefundRecord> {
    return this.refundService.cancelRefund(id, reason);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: '获取退款概览' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款概览获取成功',
    type: RefundOverviewDto,
  })
  async getOverview(): Promise<RefundOverviewDto> {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [todayStats, weekStats, monthStats, trends, statusDistribution, reasonDistribution] = await Promise.all([
      this.refundService.getRefundStats(startOfToday, endOfToday),
      this.refundService.getRefundStats(startOfWeek, endOfWeek),
      this.refundService.getRefundStats(startOfMonth, endOfMonth),
      this.refundService.getRefundTrends(startOfMonth, endOfMonth),
      this.refundService.getRefundStats(startOfMonth, endOfMonth),
      this.refundService.getRefundStats(startOfMonth, endOfMonth),
    ]);

    return {
      today: todayStats,
      thisWeek: weekStats,
      thisMonth: monthStats,
      trend: trends.map(t => ({
        ...t,
        successCount: 0,
        failedCount: 0,
        successRate: 0
      })),
      statusDistribution: statusDistribution.statusStats,
      reasonDistribution: reasonDistribution.reasonStats,
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: '获取退款统计' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'userId', required: false, description: '用户ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款统计获取成功',
    type: RefundStatsDto,
  })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ): Promise<RefundStatsDto> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.refundService.getRefundStats(start, end);
  }

  @Get('stats/trends')
  @ApiOperation({ summary: '获取退款趋势' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '退款趋势获取成功',
  })
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.refundService.getRefundTrends(start, end);
  }

  @Post('batch/process')
  @ApiOperation({ summary: '批量处理退款' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量处理成功',
  })
  async batchProcess(
    @Body('refundIds') refundIds: string[],
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const result = await this.refundService.batchProcessRefunds(refundIds);
    return {
      successCount: result.success.length,
      failureCount: result.failed.length,
      results: [
        ...result.success.map(id => ({ id, success: true })),
        ...result.failed.map(item => ({ id: item.id, success: false, error: item.error }))
      ]
    };
  }
}