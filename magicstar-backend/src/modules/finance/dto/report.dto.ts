import { IsDate, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// 日报DTO
export class DailyReportDto {
  @ApiProperty({ description: '日期' })
  date: string;

  @ApiProperty({ description: '收入统计' })
  income: {
    totalAmount: number;
    totalCount: number;
  };

  @ApiProperty({ description: '退款统计' })
  refund: {
    totalAmount: number;
    totalCount: number;
  };

  @ApiProperty({ description: '净收入' })
  netIncome: number;

  @ApiProperty({ description: '支付方式统计' })
  paymentMethods: Array<{
    method: string;
    amount: number;
    count: number;
  }>;

  @ApiProperty({ description: '新用户数量' })
  newUserCount: number;

  @ApiProperty({ description: '订单统计' })
  orders: {
    totalCount: number;
    totalAmount: number;
  };
}

// 月报DTO
export class MonthlyReportDto {
  @ApiProperty({ description: '年份' })
  year: number;

  @ApiProperty({ description: '月份' })
  month: number;

  @ApiProperty({ description: '月度汇总' })
  summary: {
    totalIncome: number;
    totalRefund: number;
    netIncome: number;
    incomeCount: number;
    refundCount: number;
    activeUsers: number;
  };

  @ApiProperty({ description: '每日数据' })
  dailyData: Array<{
    date: string;
    income: number;
    refund: number;
    netIncome: number;
    incomeCount: number;
    refundCount: number;
  }>;
}

// 渠道报表DTO
export class ChannelReportDto {
  @ApiProperty({ description: '渠道名称' })
  channel: string;

  @ApiProperty({ description: '总金额' })
  totalAmount: number;

  @ApiProperty({ description: '总笔数' })
  totalCount: number;

  @ApiProperty({ description: '平均金额' })
  avgAmount: number;

  @ApiProperty({ description: '成功率' })
  successRate: number;
}

// 支付渠道报表DTO
export class PaymentChannelReportDto {
  @ApiProperty({ description: '支付渠道' })
  channel: string;

  @ApiProperty({ description: '总金额' })
  totalAmount: number;

  @ApiProperty({ description: '总笔数' })
  totalCount: number;

  @ApiProperty({ description: '平均金额' })
  avgAmount: number;

  @ApiProperty({ description: '最大金额' })
  maxAmount: number;

  @ApiProperty({ description: '最小金额' })
  minAmount: number;

  @ApiProperty({ description: '退款金额' })
  refundAmount: number;

  @ApiProperty({ description: '退款笔数' })
  refundCount: number;

  @ApiProperty({ description: '净金额' })
  netAmount: number;

  @ApiProperty({ description: '退款率' })
  refundRate: number;
}

// 用户报表DTO
export class UserReportDto {
  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '用户昵称' })
  nickname: string;

  @ApiProperty({ description: '总金额' })
  totalAmount: number;

  @ApiProperty({ description: '总笔数' })
  totalCount: number;

  @ApiProperty({ description: '平均金额' })
  avgAmount: number;

  @ApiProperty({ description: '首次支付时间' })
  firstPaymentAt: Date;

  @ApiProperty({ description: '最后支付时间' })
  lastPaymentAt: Date;
}

// 导出报表DTO
export class ExportReportDto {
  @ApiProperty({ description: '文件名' })
  fileName: string;

  @ApiProperty({ description: '文件路径' })
  filePath: string;

  @ApiProperty({ description: '下载链接' })
  downloadUrl: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

// 生成日报请求DTO
export class GenerateDailyReportDto {
  @ApiProperty({ description: '日期', example: '2024-01-01' })
  @IsDate()
  @Type(() => Date)
  date: Date;
}

// 生成月报请求DTO
export class GenerateMonthlyReportDto {
  @ApiProperty({ description: '年份', example: 2024 })
  @IsNumber()
  year: number;

  @ApiProperty({ description: '月份', example: 1 })
  @IsNumber()
  month: number;
}

// 生成渠道报表请求DTO
export class GenerateChannelReportDto {
  @ApiProperty({ description: '开始日期' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: '结束日期' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

// 生成用户报表请求DTO
export class GenerateUserReportDto {
  @ApiProperty({ description: '开始日期' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: '结束日期' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty({ description: '限制数量', example: 100, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// 导出报表请求DTO
export class ExportReportRequestDto {
  @ApiProperty({ 
    description: '报表类型', 
    enum: ['daily', 'monthly', 'channel', 'user'],
    example: 'daily'
  })
  @IsEnum(['daily', 'monthly', 'channel', 'user'])
  type: 'daily' | 'monthly' | 'channel' | 'user';

  @ApiProperty({ description: '参数', example: { date: '2024-01-01' } })
  params: any;
}

// 收入趋势请求DTO
export class IncomeTrendDto {
  @ApiProperty({ description: '开始日期' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: '结束日期' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty({ 
    description: '时间粒度', 
    enum: ['day', 'week', 'month'],
    example: 'day',
    required: false
  })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month';
}

// 收入趋势响应DTO
export class IncomeTrendResponseDto {
  @ApiProperty({ description: '日期' })
  date: string;

  @ApiProperty({ description: '金额' })
  amount: number;

  @ApiProperty({ description: '笔数' })
  count: number;
}