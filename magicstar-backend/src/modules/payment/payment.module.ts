import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentRecord } from './entities/payment-record.entity';
import { WechatPaymentService } from './services/wechat-payment.service';
import { AlipayService } from './services/alipay.service';
import { PaymentService } from './services/payment.service';
import { PaymentSecurityService } from './services/payment-security.service';
import { PaymentLoggerService } from './services/payment-logger.service';
import { PaymentController } from './controllers/payment.controller';
import { WechatPaymentController } from './controllers/wechat-payment.controller';
import { AlipayController } from './controllers/alipay.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentRecord]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [
    PaymentController,
    WechatPaymentController,
    AlipayController,
  ],
  providers: [
    WechatPaymentService,
    AlipayService,
    PaymentService,
    PaymentSecurityService,
    PaymentLoggerService,
  ],
  exports: [
    PaymentService,
    WechatPaymentService,
    AlipayService,
    PaymentSecurityService,
    PaymentLoggerService,
  ],
})
export class PaymentModule {}