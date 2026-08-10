import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CustomerPaymentsController,
  PublicPaymentsController,
} from './payments.controller';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  // InquiriesModule re-exports its TypeOrm repositories (Inquiry, PaymentLink,
  // PaymentProof) plus InquiriesService, so PaymentsService can inject them.
  imports: [InquiriesModule, SettingsModule],
  providers: [PaymentsService],
  controllers: [PublicPaymentsController, CustomerPaymentsController],
})
export class PaymentsModule {}
