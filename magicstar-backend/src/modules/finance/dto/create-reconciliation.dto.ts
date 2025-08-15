import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ReconciliationType,
  PaymentChannel,
} from '../entities/reconciliation-record.entity';

export class CreateReconciliationDto {
  @ApiProperty({
    description: '对账类型',
    enum: ReconciliationType,
    example: ReconciliationType.DAILY,
  })
  @IsEnum(ReconciliationType)
  type: ReconciliationType;

  @ApiProperty({
    description: '支付渠道',
    enum: PaymentChannel,
    example: PaymentChannel.WECHAT,
  })
  @IsEnum(PaymentChannel)
  paymentChannel: PaymentChannel;

  @ApiProperty({
    description: '对账日期',
    example: '2024-01-15',
  })
  @IsDateString()
  @Type(() => Date)
  reconciliationDate: Date;

  @ApiProperty({
    description: '操作员ID',
    example: 'user123',
    required: false,
  })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiProperty({
    description: '备注',
    example: '手动发起的日对账',
    required: false,
  })
  @IsOptional()
  @IsString()
  remark?: string;
}