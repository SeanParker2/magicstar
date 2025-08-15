import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RefundReason } from '../entities/refund-record.entity';

export class CreateRefundDto {
  @ApiProperty({
    description: '支付ID',
    example: 'uuid-string',
  })
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: '退款金额',
    example: 99.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @ApiProperty({
    description: '退款原因',
    enum: RefundReason,
    example: RefundReason.USER_REQUEST,
  })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiProperty({
    description: '退款描述',
    example: '用户申请退款',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: '操作员ID',
    example: 'uuid-string',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiProperty({
    description: '备注',
    example: '系统自动退款',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remark?: string;

  @ApiProperty({
    description: '扩展数据',
    example: { source: 'admin' },
    required: false,
  })
  @IsOptional()
  metadata?: any;
}