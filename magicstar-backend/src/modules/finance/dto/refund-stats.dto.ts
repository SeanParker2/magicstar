import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus, RefundReason } from '../entities/refund-record.entity';

export class RefundStatsDto {
  @ApiProperty({ description: '总退款笔数' })
  totalCount: number;

  @ApiProperty({ description: '总退款金额' })
  totalAmount: number;

  @ApiProperty({ description: '平均退款金额' })
  avgAmount: number;

  @ApiProperty({ description: '退款成功率' })
  successRate: number;

  @ApiProperty({ description: '按状态统计' })
  statusStats: Array<{
    status: RefundStatus;
    count: number;
    amount: number;
  }>;

  @ApiProperty({ description: '按原因统计' })
  reasonStats: Array<{
    reason: RefundReason;
    count: number;
    amount: number;
  }>;

  @ApiProperty({ description: '统计周期' })
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export class RefundStatusStatsDto {
  @ApiProperty({ description: '退款状态' })
  status: RefundStatus;

  @ApiProperty({ description: '数量' })
  count: number;

  @ApiProperty({ description: '金额' })
  amount: number;

  @ApiProperty({ description: '占比' })
  percentage?: number;
}

export class RefundReasonStatsDto {
  @ApiProperty({ description: '退款原因' })
  reason: RefundReason;

  @ApiProperty({ description: '数量' })
  count: number;

  @ApiProperty({ description: '金额' })
  amount: number;

  @ApiProperty({ description: '占比' })
  percentage?: number;
}

export class RefundTrendDto {
  @ApiProperty({ description: '日期' })
  date: string;

  @ApiProperty({ description: '退款金额' })
  amount: number;

  @ApiProperty({ description: '退款笔数' })
  count: number;

  @ApiProperty({ description: '成功笔数' })
  successCount: number;

  @ApiProperty({ description: '失败笔数' })
  failedCount: number;

  @ApiProperty({ description: '成功率' })
  successRate: number;
}

export class RefundOverviewDto {
  @ApiProperty({ description: '今日退款统计' })
  today: RefundStatsDto;

  @ApiProperty({ description: '本周退款统计' })
  thisWeek: RefundStatsDto;

  @ApiProperty({ description: '本月退款统计' })
  thisMonth: RefundStatsDto;

  @ApiProperty({ description: '退款趋势' })
  trend: RefundTrendDto[];

  @ApiProperty({ description: '状态分布' })
  statusDistribution: RefundStatusStatsDto[];

  @ApiProperty({ description: '原因分布' })
  reasonDistribution: RefundReasonStatsDto[];
}