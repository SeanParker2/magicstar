import { ApiProperty } from '@nestjs/swagger';
import { FinancialRecordType } from '../entities/financial-record.entity';

export class FinancialSummaryDto {
  @ApiProperty({ description: '总收入' })
  totalIncome: number;

  @ApiProperty({ description: '总支出' })
  totalExpense: number;

  @ApiProperty({ description: '净收入' })
  netIncome: number;

  @ApiProperty({ description: '收入笔数' })
  incomeCount: number;

  @ApiProperty({ description: '支出笔数' })
  expenseCount: number;

  @ApiProperty({ description: '按类型统计' })
  typeStats: Array<{
    type: FinancialRecordType;
    amount: number;
    count: number;
  }>;

  @ApiProperty({ description: '统计周期' })
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export class FinancialTypeStatsDto {
  @ApiProperty({ description: '记录类型' })
  type: FinancialRecordType;

  @ApiProperty({ description: '总金额' })
  amount: number;

  @ApiProperty({ description: '总笔数' })
  count: number;

  @ApiProperty({ description: '占比' })
  percentage?: number;
}

export class FinancialTrendDto {
  @ApiProperty({ description: '日期' })
  date: string;

  @ApiProperty({ description: '收入金额' })
  income: number;

  @ApiProperty({ description: '支出金额' })
  expense: number;

  @ApiProperty({ description: '净收入' })
  netIncome: number;

  @ApiProperty({ description: '收入笔数' })
  incomeCount: number;

  @ApiProperty({ description: '支出笔数' })
  expenseCount: number;
}

export class FinancialOverviewDto {
  @ApiProperty({ description: '今日汇总' })
  today: FinancialSummaryDto;

  @ApiProperty({ description: '本周汇总' })
  thisWeek: FinancialSummaryDto;

  @ApiProperty({ description: '本月汇总' })
  thisMonth: FinancialSummaryDto;

  @ApiProperty({ description: '本年汇总' })
  thisYear: FinancialSummaryDto;

  @ApiProperty({ description: '趋势数据' })
  trend: FinancialTrendDto[];

  @ApiProperty({ description: '类型分布' })
  typeDistribution: FinancialTypeStatsDto[];
}