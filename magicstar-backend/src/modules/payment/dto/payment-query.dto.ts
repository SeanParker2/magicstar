import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod, PaymentType } from '../entities/payment.entity';
import { Transform } from 'class-transformer';

export class PaymentQueryDto {
  @ApiPropertyOptional({ description: '支付单号' })
  @IsString()
  @IsOptional()
  paymentNo?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '订单ID' })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ 
    description: '支付状态',
    enum: PaymentStatus
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ 
    description: '支付方式',
    enum: PaymentMethod
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ 
    description: '支付类型',
    enum: PaymentType
  })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Transform(({ value }) => parseInt(value) || 1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Transform(({ value }) => parseInt(value) || 20)
  @IsOptional()
  limit?: number = 20;
}

export class PaymentCallbackDto {
  @ApiPropertyOptional({ description: '第三方支付流水号' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ description: '商户订单号' })
  @IsString()
  @IsOptional()
  outTradeNo?: string;

  @ApiPropertyOptional({ description: '支付金额' })
  @IsString()
  @IsOptional()
  totalFee?: string;

  @ApiPropertyOptional({ description: '支付状态' })
  @IsString()
  @IsOptional()
  resultCode?: string;

  @ApiPropertyOptional({ description: '支付时间' })
  @IsString()
  @IsOptional()
  timeEnd?: string;

  @ApiPropertyOptional({ description: '附加数据' })
  @IsString()
  @IsOptional()
  attach?: string;

  // 微信支付特有字段
  @ApiPropertyOptional({ description: '微信支付订单号' })
  @IsString()
  @IsOptional()
  transactionId_wechat?: string;

  @ApiPropertyOptional({ description: '微信支付商户号' })
  @IsString()
  @IsOptional()
  mchId?: string;

  @ApiPropertyOptional({ description: '微信支付应用ID' })
  @IsString()
  @IsOptional()
  appid?: string;

  // 支付宝特有字段
  @ApiPropertyOptional({ description: '支付宝交易号' })
  @IsString()
  @IsOptional()
  tradeNo?: string;

  @ApiPropertyOptional({ description: '支付宝应用ID' })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiPropertyOptional({ description: '卖家支付宝用户ID' })
  @IsString()
  @IsOptional()
  sellerId?: string;
}

export class RefundDto {
  @ApiPropertyOptional({ description: '支付ID' })
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({ description: '退款金额' })
  @Transform(({ value }) => parseFloat(value))
  refundAmount: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsString()
  @IsOptional()
  refundReason?: string;

  @ApiPropertyOptional({ description: '退款单号' })
  @IsString()
  @IsOptional()
  refundNo?: string;
}