import { ApiProperty } from '@nestjs/swagger';

export class RefundTrendDto {
  @ApiProperty({ description: '日期' })
  date: string;

  @ApiProperty({ description: '退款金额' })
  amount: number;

  @ApiProperty({ description: '退款笔数' })
  count: number;
}

export class RefundOverviewDto {
  @ApiProperty({ description: '总退款金额' })
  totalAmount: number;

  @ApiProperty({ description: '总退款笔数' })
  totalCount: number;

  @ApiProperty({ description: '平均退款金额' })
  avgAmount: number;

  @ApiProperty({ description: '退款成功率' })
  successRate: number;

  @ApiProperty({ description: '今日退款金额' })
  todayAmount: number;

  @ApiProperty({ description: '今日退款笔数' })
  todayCount: number;

  @ApiProperty({ description: '退款趋势数据', type: [RefundTrendDto] })
  trend: RefundTrendDto[];
}