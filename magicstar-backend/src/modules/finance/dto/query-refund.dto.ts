import {
  IsEnum,
  IsOptional,
  IsDate,
  IsUUID,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus, RefundReason } from '../entities/refund-record.entity';

export class QueryRefundDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({
    description: '退款状态',
    enum: RefundStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiProperty({
    description: '退款原因',
    enum: RefundReason,
    required: false,
  })
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @ApiProperty({
    description: '用户ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: '支付ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiProperty({
    description: '订单ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: '结束日期',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: '退款单号',
    example: 'RF1234567890123',
    required: false,
  })
  @IsOptional()
  @IsString()
  refundNo?: string;

  @ApiProperty({
    description: '排序字段',
    example: 'createdAt',
    enum: ['createdAt', 'amount', 'refundDate'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['createdAt', 'amount', 'refundDate'])
  sortBy?: 'createdAt' | 'amount' | 'refundDate';

  @ApiProperty({
    description: '排序方向',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}