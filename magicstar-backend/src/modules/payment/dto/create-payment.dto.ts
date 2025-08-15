import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: '订单ID' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ 
    description: '支付方式',
    enum: PaymentMethod,
    example: PaymentMethod.WECHAT_PAY
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ 
    description: '支付类型',
    enum: PaymentType,
    default: PaymentType.ORDER
  })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType = PaymentType.ORDER;

  @ApiProperty({ description: '支付金额', example: 99.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: '支付描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '货币类型', default: 'CNY' })
  @IsString()
  @IsOptional()
  currency?: string = 'CNY';

  @ApiPropertyOptional({ description: '客户端IP' })
  @IsString()
  @IsOptional()
  clientIp?: string;

  @ApiPropertyOptional({ description: '用户代理' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: '支付参数' })
  @IsOptional()
  paymentParams?: any;
}

export class WechatPaymentDto {
  @ApiProperty({ description: '支付ID' })
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;

  @ApiPropertyOptional({ description: '支付场景', example: 'JSAPI' })
  @IsString()
  @IsOptional()
  tradeType?: string = 'JSAPI';

  @ApiPropertyOptional({ description: '用户OpenID（JSAPI支付必填）' })
  @IsString()
  @IsOptional()
  openid?: string;

  @ApiPropertyOptional({ description: '商品标签' })
  @IsString()
  @IsOptional()
  goodsTag?: string;

  @ApiPropertyOptional({ description: '附加数据' })
  @IsString()
  @IsOptional()
  attach?: string;
}

export class AlipayDto {
  @ApiProperty({ description: '支付ID' })
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;

  @ApiPropertyOptional({ description: '产品码', example: 'QUICK_MSECURITY_PAY' })
  @IsString()
  @IsOptional()
  productCode?: string = 'QUICK_MSECURITY_PAY';

  @ApiPropertyOptional({ description: '用户付款中途退出返回商户网站的地址' })
  @IsString()
  @IsOptional()
  quitUrl?: string;

  @ApiPropertyOptional({ description: '附加数据' })
  @IsString()
  @IsOptional()
  passbackParams?: string;
}