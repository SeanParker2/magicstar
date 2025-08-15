import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceController } from './controllers/finance.controller';
import { ReportController } from './controllers/report.controller';
import { RefundController } from './controllers/refund.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { FinanceService } from './services/finance.service';
import { ReportService } from './services/report.service';
import { RefundService } from './services/refund.service';
import { ReconciliationService } from './services/reconciliation.service';
import { FinancialRecord } from './entities/financial-record.entity';
import { RefundRecord } from './entities/refund-record.entity';
import { ReconciliationRecord } from './entities/reconciliation-record.entity';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialRecord,
      RefundRecord,
      ReconciliationRecord,
    ]),
    PaymentModule,
    UserModule,
  ],
  controllers: [
    FinanceController,
    ReportController,
    RefundController,
    ReconciliationController,
  ],
  providers: [
    FinanceService,
    ReportService,
    ReconciliationService,
    RefundService,
  ],
  exports: [
    FinanceService,
    ReportService,
    ReconciliationService,
    RefundService,
  ],
})
export class FinanceModule {}