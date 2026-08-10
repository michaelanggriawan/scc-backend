import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentLink } from '../../entities/payment-link.entity';
import { Inquiry } from '../../entities/inquiry.entity';
import { InquiriesService, UploadedProof } from '../inquiries/inquiries.service';
import { SettingsService } from '../settings/settings.service';
import { PAYABLE_STATUSES } from '../../common/enums';
import { isPastDue } from '../../common/utils';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentLink)
    private readonly linkRepo: Repository<PaymentLink>,
    @InjectRepository(Inquiry)
    private readonly inquiryRepo: Repository<Inquiry>,
    private readonly inquiries: InquiriesService,
    private readonly settings: SettingsService,
  ) {}

  // ─── Public: resolve a payment link token to a pay page ──
  private async resolveActiveLink(token: string): Promise<PaymentLink> {
    const link = await this.linkRepo.findOne({ where: { token } });
    if (!link || !link.isActive) {
      throw new NotFoundException('This payment link is invalid or no longer active.');
    }
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This payment link has expired.');
    }
    return link;
  }

  private async payViewForInquiry(inquiry: Inquiry) {
    const enriched = await this.inquiries.enrich(inquiry);
    const paymentInfo = await this.settings.getPaymentInfo();
    const payable =
      PAYABLE_STATUSES.includes(inquiry.status) &&
      !isPastDue(inquiry.paymentDueDate);
    return {
      ref: inquiry.ref,
      status: inquiry.status,
      payable,
      amount: inquiry.agreedPrice,
      dueDate: inquiry.paymentDueDate,
      customerName: inquiry.customerName,
      room: enriched.room,
      addons: enriched.addons,
      paymentInfo,
    };
  }

  async getByToken(token: string) {
    const link = await this.resolveActiveLink(token);
    const inquiry = await this.inquiryRepo.findOne({
      where: { id: link.inquiryId },
    });
    if (!inquiry) throw new NotFoundException('Booking not found');
    return this.payViewForInquiry(inquiry);
  }

  async submitProofByToken(token: string, file: UploadedProof) {
    const link = await this.resolveActiveLink(token);
    const inquiry = await this.inquiryRepo.findOne({
      where: { id: link.inquiryId },
    });
    if (!inquiry) throw new NotFoundException('Booking not found');
    const updated = await this.inquiries.submitProof(inquiry, file);
    return this.payViewForInquiry(updated);
  }

  // ─── Customer (logged-in) path via Profile ─────────────
  async getPaymentInfoForRef(ref: string, userId: string) {
    const inquiry = await this.inquiryRepo.findOne({ where: { ref } });
    if (!inquiry || inquiry.customerId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    return this.payViewForInquiry(inquiry);
  }

  async submitProofByRef(ref: string, userId: string, file: UploadedProof) {
    const inquiry = await this.inquiryRepo.findOne({ where: { ref } });
    if (!inquiry || inquiry.customerId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    const updated = await this.inquiries.submitProof(inquiry, file);
    return this.payViewForInquiry(updated);
  }
}
