import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundReason, RefundType } from '../entities/refund.entity';

export class CreateRefundDto {
  @ApiProperty({ description: '支付ID' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: '退款金额（分）' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: RefundReason, description: '退款原因' })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiProperty({ enum: RefundType, description: '退款类型' })
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiPropertyOptional({ description: '退款说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '操作员备注' })
  @IsOptional()
  @IsString()
  operatorNotes?: string;
}

export class RefundQueryDto {
  @ApiPropertyOptional({ description: '支付ID' })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '订单ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ enum: RefundReason, description: '退款原因' })
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

export class ProcessRefundDto {
  @ApiProperty({ description: '退款ID' })
  @IsString()
  refundId: string;

  @ApiPropertyOptional({ description: '操作员备注' })
  @IsOptional()
  @IsString()
  operatorNotes?: string;
}

export class ExportRefundDto {
  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '导出格式' })
  @IsOptional()
  @IsEnum(['excel', 'csv'])
  format?: string = 'excel';

  @ApiPropertyOptional({ description: '是否包含详细信息' })
  @IsOptional()
  includeDetails?: boolean = true;
}