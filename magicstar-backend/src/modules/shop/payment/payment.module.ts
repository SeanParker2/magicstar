import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { FinancialReport } from './entities/financial-report.entity';
import { Refund } from './entities/refund.entity';
import { Order } from '../entities/order.entity';
import { User } from '../../user/entities/user.entity';
import { PaymentController } from './payment.controller';
// import { FinancialReportController } from './financial-report.controller';
import { RefundController } from './refund.controller';
import { PaymentService } from './payment.service';
import { PaymentSecurityService } from './payment-security.service';
import { PaymentLogService } from './payment-log.service';
import { FinancialReportService } from './financial-report.service';
import { RefundService } from './refund.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentLog,
      FinancialReport,
      Refund,
      Order,
      User,
    ]),
  ],
  controllers: [PaymentController, RefundController],
  providers: [
    PaymentService,
    PaymentSecurityService,
    PaymentLogService,
    FinancialReportService,
    RefundService,
  ],
  exports: [
    PaymentService,
    PaymentSecurityService,
    PaymentLogService,
    FinancialReportService,
    RefundService,
  ],
})
export class PaymentModule {}