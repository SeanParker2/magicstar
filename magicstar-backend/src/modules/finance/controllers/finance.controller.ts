import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { RequireRoles } from '../../../decorators/permissions.decorator';
import { FinanceService } from '../services/finance.service';
import { CreateFinancialRecordDto } from '../dto/create-financial-record.dto';
import { QueryFinancialRecordsDto } from '../dto/query-financial-records.dto';
import { FinancialSummaryDto, FinancialOverviewDto } from '../dto/financial-summary.dto';
import { FinancialRecord } from '../entities/financial-record.entity';

@ApiTags('财务管理')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('records')
  // @Roles('admin', 'finance')
  @ApiOperation({ summary: '创建财务记录' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '财务记录创建成功',
    type: FinancialRecord,
  })
  @HttpCode(HttpStatus.CREATED)
  async createRecord(
    @Body() createDto: CreateFinancialRecordDto,
  ): Promise<FinancialRecord> {
    return this.financeService.create(createDto);
  }

  @Get('records')
  // @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: '查询财务记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '财务记录查询成功',
  })
  async findRecords(
    @Query() queryDto: QueryFinancialRecordsDto,
  ): Promise<{
    records: FinancialRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.financeService.findAll(queryDto);
  }

  @Get('records/:id')
  @RequireRoles('admin', 'finance', 'user')
  @ApiOperation({ summary: '获取财务记录详情' })
  @ApiParam({ name: 'id', description: '财务记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '财务记录详情获取成功',
    type: FinancialRecord,
  })
  async getRecord(@Param('id') id: string): Promise<FinancialRecord> {
    return this.financeService.findOne(id);
  }

  @Get('summary')
  @RequireRoles('admin', 'finance')
  @ApiOperation({ summary: '获取财务汇总' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'userId', required: false, description: '用户ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '财务汇总获取成功',
    type: FinancialSummaryDto,
  })
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ): Promise<FinancialSummaryDto> {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    return this.financeService.getFinancialSummary(start, end, userId);
  }

  @Get('overview')
  @RequireRoles('admin', 'finance')
  @ApiOperation({ summary: '获取财务概览' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '财务概览获取成功',
    type: FinancialOverviewDto,
  })
  async getOverview(): Promise<FinancialOverviewDto> {
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

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);

    const [todaySummary, weekSummary, monthSummary, yearSummary, rawTrends] = await Promise.all([
      this.financeService.getFinancialSummary(startOfToday, endOfToday),
      this.financeService.getFinancialSummary(startOfWeek, endOfWeek),
      this.financeService.getFinancialSummary(startOfMonth, endOfMonth),
      this.financeService.getFinancialSummary(startOfYear, endOfYear),
      this.financeService.getIncomeTrend(startOfMonth, endOfMonth),
    ]);

    // 转换趋势数据格式
    const trends = rawTrends.map(item => ({
      date: item.date,
      income: item.amount,
      expense: 0,
      netIncome: item.amount,
      incomeCount: item.count,
      expenseCount: 0
    }));

    return {
      today: todaySummary,
      thisWeek: weekSummary,
      thisMonth: monthSummary,
      thisYear: yearSummary,
      trend: trends,
      typeDistribution: monthSummary.typeStats,
    };
  }

  @Get('trends')
  @RequireRoles('admin', 'finance')
  @ApiOperation({ summary: '获取收入趋势' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '收入趋势获取成功',
  })
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const trends = await this.financeService.getIncomeTrend(start, end);
    // 转换为FinancialTrendDto格式
    const formattedTrends = trends.map(item => ({
      date: item.date,
      income: item.amount,
      expense: 0,
      netIncome: item.amount,
      incomeCount: item.count,
      expenseCount: 0
    }));
    return { trend: formattedTrends };
  }
}