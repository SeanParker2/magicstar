import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ReconciliationType,
  ReconciliationStatus,
  PaymentChannel,
} from '../entities/reconciliation-record.entity';

export class QueryReconciliationDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({
    description: '对账类型',
    enum: ReconciliationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReconciliationType)
  type?: ReconciliationType;

  @ApiProperty({
    description: '对账状态',
    enum: ReconciliationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReconciliationStatus)
  status?: ReconciliationStatus;

  @ApiProperty({
    description: '支付渠道',
    enum: PaymentChannel,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentChannel)
  paymentChannel?: PaymentChannel;

  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: '结束日期',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  endDate?: Date;
}