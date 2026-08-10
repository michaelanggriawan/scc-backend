import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
import { PaymentLink } from '../../entities/payment-link.entity';
import { PaymentProof } from '../../entities/payment-proof.entity';
import { InquiriesService } from './inquiries.service';
import {
  AdminInquiriesController,
  CustomerInquiriesController,
  PublicInquiriesController,
} from './inquiries.controller';
import { RoomsModule } from '../rooms/rooms.module';
import { AddOnsModule } from '../addons/addons.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, PaymentLink, PaymentProof]),
    RoomsModule,
    AddOnsModule,
    SettingsModule,
  ],
  providers: [InquiriesService],
  controllers: [
    PublicInquiriesController,
    CustomerInquiriesController,
    AdminInquiriesController,
  ],
  exports: [InquiriesService, TypeOrmModule],
})
export class InquiriesModule {}
