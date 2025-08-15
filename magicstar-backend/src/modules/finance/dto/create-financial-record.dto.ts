import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDate,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  FinancialRecordType,
  FinancialRecordStatus,
} from '../entities/financial-record.entity';

export class CreateFinancialRecordDto {
  @ApiProperty({
    description: '记录类型',
    enum: FinancialRecordType,
    example: FinancialRecordType.INCOME,
  })
  @IsEnum(FinancialRecordType)
  type: FinancialRecordType;

  @ApiProperty({
    description: '记录状态',
    enum: FinancialRecordStatus,
    example: FinancialRecordStatus.CONFIRMED,
    required: false,
  })
  @IsOptional()
  @IsEnum(FinancialRecordStatus)
  status?: FinancialRecordStatus;

  @ApiProperty({
    description: '金额',
    example: 99.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @ApiProperty({
    description: '货币类型',
    example: 'CNY',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({
    description: '用户ID',
    example: 'uuid-string',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: '支付ID',
    example: 'uuid-string',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiProperty({
    description: '订单ID',
    example: 'uuid-string',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({
    description: '关联业务ID',
    example: 'business-id',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({
    description: '业务类型',
    example: 'payment',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({
    description: '描述',
    example: '支付收入 - 微信支付',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: '记录日期',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  recordDate?: Date;

  @ApiProperty({
    description: '扩展数据',
    example: { paymentMethod: 'wechat' },
    required: false,
  })
  @IsOptional()
  metadata?: any;

  @ApiProperty({
    description: '备注',
    example: '系统自动生成',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remark?: string;
}