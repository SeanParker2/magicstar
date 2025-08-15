import { Module } from '@nestjs/common';
import { SmsService } from './services/sms.service';
import { EmailService } from './services/email.service';

@Module({
  providers: [SmsService, EmailService],
  exports: [SmsService, EmailService],
})
export class CommonModule {}