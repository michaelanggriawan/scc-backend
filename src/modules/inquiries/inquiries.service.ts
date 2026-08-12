import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
import { PaymentLink } from '../../entities/payment-link.entity';
import { PaymentProof } from '../../entities/payment-proof.entity';
import {
  CancelledBy,
  CUSTOMER_CANCELLABLE_STATUSES,
  EDITABLE_INQUIRY_STATUSES,
  InquiryStatus,
  PAYABLE_STATUSES,
} from '../../common/enums';
import {
  addHours,
  buildInquiryRef,
  formatDueDate,
  generatePaymentToken,
  isPastDue,
} from '../../common/utils';
import { RoomsService } from '../rooms/rooms.service';
import { AddOnsService } from '../addons/addons.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';
import {
  CreateInquiryDto,
  ListInquiriesDto,
  MarkAwaitingPaymentDto,
  RejectPaymentDto,
  UpdateTermsDto,
} from './dto/inquiry.dto';

export interface UploadedProof {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly repo: Repository<Inquiry>,
    @InjectRepository(PaymentLink)
    private readonly linkRepo: Repository<PaymentLink>,
    @InjectRepository(PaymentProof)
    private readonly proofRepo: Repository<PaymentProof>,
    private readonly rooms: RoomsService,
    private readonly addons: AddOnsService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get maxRejections(): number {
    return this.config.get<number>('payments.maxRejections') ?? 3;
  }

  // ─── Reference generation ────────────────────────────
  private async nextRef(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo
      .createQueryBuilder('i')
      .where('i.ref LIKE :prefix', { prefix: `SCC-${year}-%` })
      .getCount();
    return buildInquiryRef(year, count + 1);
  }

  // ─── Enrichment (resolve room + add-ons for detail views) ──
  async enrich(inquiry: Inquiry) {
    const room = inquiry.roomId
      ? await this.rooms.findById(inquiry.roomId).catch(() => null)
      : null;
    const addons = await this.addons.findByIds(inquiry.addonIds ?? []);
    const proofs = await this.proofRepo.find({
      where: { inquiryId: inquiry.id },
      order: { submittedAt: 'DESC' },
    });
    return { ...inquiry, room, addons, proofs };
  }

  // ─── Customer: create ────────────────────────────────
  async create(
    dto: CreateInquiryDto,
    userId?: string,
  ): Promise<Inquiry> {
    if (dto.roomId) {
      const room = await this.rooms.findById(dto.roomId); // 404s if missing
      if (room.status !== 'Active') {
        throw new BadRequestException('Selected room is not available');
      }
    }
    const ref = await this.nextRef();
    const inquiry = this.repo.create({
      ref,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail.toLowerCase(),
      customerPhone: dto.customerPhone ?? '',
      customerId: userId ?? null,
      roomId: dto.roomId ?? null,
      addonIds: dto.addonIds ?? [],
      date: dto.date ?? '',
      time: dto.time ?? '',
      duration: dto.duration ?? '',
      category: dto.category ?? '',
      notes: dto.notes ?? '',
      status: InquiryStatus.NewInquiry,
    });
    const saved = await this.repo.save(inquiry);
    await this.notifyAdminNewInquiry(saved);
    return saved;
  }

  // ─── Customer: list own ──────────────────────────────
  listMine(userId: string): Promise<Inquiry[]> {
    return this.repo.find({
      where: { customerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMineByRef(ref: string, userId: string) {
    const inquiry = await this.repo.findOne({ where: { ref } });
    if (!inquiry || inquiry.customerId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    return this.enrich(inquiry);
  }

  async customerCancel(ref: string, userId: string, reason: string) {
    const inquiry = await this.repo.findOne({ where: { ref } });
    if (!inquiry || inquiry.customerId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(inquiry.status)) {
      throw new BadRequestException(
        `A booking that is "${inquiry.status}" can no longer be cancelled by you.`,
      );
    }
    inquiry.status = InquiryStatus.Cancelled;
    inquiry.cancelledBy = CancelledBy.Customer;
    inquiry.cancelReason = reason ?? '';
    await this.deactivateLinks(inquiry.id);
    return this.repo.save(inquiry);
  }

  // ─── Admin: list with filters + pagination ───────────
  async adminList(q: ListInquiriesDto) {
    const qb = this.repo.createQueryBuilder('i');
    if (q.status) qb.andWhere('i.status = :status', { status: q.status });
    if (q.dateFrom) qb.andWhere('i.date >= :from', { from: q.dateFrom });
    if (q.dateTo) qb.andWhere('i.date <= :to', { to: q.dateTo });
    if (q.search) {
      const like = `%${q.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(i.customerName) LIKE :like', { like }).orWhere(
            'LOWER(i.ref) LIKE :like',
            { like },
          );
        }),
      );
    }
    qb.orderBy('i.createdAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: q.page, limit: q.limit };
  }

  async adminGet(ref: string) {
    const inquiry = await this.findByRefOrFail(ref);
    return this.enrich(inquiry);
  }

  private async findByRefOrFail(ref: string): Promise<Inquiry> {
    const inquiry = await this.repo.findOne({ where: { ref } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  // ─── Admin: edit deal terms ──────────────────────────
  async updateTerms(ref: string, dto: UpdateTermsDto): Promise<Inquiry> {
    const inquiry = await this.findByRefOrFail(ref);
    if (!EDITABLE_INQUIRY_STATUSES.includes(inquiry.status)) {
      throw new BadRequestException(
        'Terms are locked once payment is submitted, confirmed, or cancelled.',
      );
    }
    if (dto.roomId !== undefined) inquiry.roomId = dto.roomId;
    if (dto.addonIds !== undefined) inquiry.addonIds = dto.addonIds;
    if (dto.agreedPrice !== undefined) inquiry.agreedPrice = dto.agreedPrice;
    if (dto.adminNotes !== undefined) inquiry.adminNotes = dto.adminNotes;
    if (dto.paymentDueDate !== undefined) {
      inquiry.paymentDueDate = dto.paymentDueDate;
      // Keep the active payment link's real expiry in sync with the new due date.
      await this.linkRepo.update(
        { inquiryId: inquiry.id, isActive: true },
        { expiresAt: new Date(dto.paymentDueDate) },
      );
    }
    return this.repo.save(inquiry);
  }

  // ─── Admin: mark awaiting payment (+ payment link) ───
  async markAwaitingPayment(ref: string, dto: MarkAwaitingPaymentDto) {
    const inquiry = await this.findByRefOrFail(ref);
    if (!EDITABLE_INQUIRY_STATUSES.includes(inquiry.status)) {
      throw new BadRequestException(
        `Cannot request payment from a booking that is "${inquiry.status}".`,
      );
    }
    if (dto.roomId !== undefined) inquiry.roomId = dto.roomId;
    if (dto.addonIds !== undefined) inquiry.addonIds = dto.addonIds;
    if (dto.adminNotes !== undefined) inquiry.adminNotes = dto.adminNotes;
    inquiry.agreedPrice = dto.agreedPrice;
    // Defaults to exactly 24h from now if the admin doesn't set one.
    inquiry.paymentDueDate =
      dto.paymentDueDate || addHours(new Date(), 24).toISOString();
    inquiry.status = InquiryStatus.AwaitingPayment;
    await this.repo.save(inquiry);

    const link = await this.regenerateLink(inquiry);
    await this.notifyCustomerAwaitingPayment(inquiry, link);
    return { inquiry: await this.enrich(inquiry), paymentLink: this.linkUrl(link) };
  }

  // ─── Admin: approve payment ──────────────────────────
  async approve(ref: string): Promise<Inquiry> {
    const inquiry = await this.findByRefOrFail(ref);
    if (inquiry.status !== InquiryStatus.PaymentSubmitted) {
      throw new BadRequestException(
        'Only a booking with a submitted payment can be approved.',
      );
    }
    inquiry.status = InquiryStatus.Confirmed;
    await this.deactivateLinks(inquiry.id);
    await this.repo.save(inquiry);
    await this.notifyCustomerConfirmed(inquiry);
    return inquiry;
  }

  // ─── Admin: reject payment (auto-cancel after N tries) ──
  async reject(ref: string, dto: RejectPaymentDto): Promise<Inquiry> {
    const inquiry = await this.findByRefOrFail(ref);
    if (inquiry.status !== InquiryStatus.PaymentSubmitted) {
      throw new BadRequestException(
        'Only a booking with a submitted payment can be rejected.',
      );
    }
    const nextCount = inquiry.rejectionCount + 1;
    inquiry.rejectionCount = nextCount;
    inquiry.rejectionReason = dto.reason;

    if (nextCount >= this.maxRejections) {
      inquiry.status = InquiryStatus.Cancelled;
      inquiry.cancelledBy = CancelledBy.System;
      inquiry.cancelReason = `Auto-cancelled after ${nextCount} payment rejections.`;
      await this.deactivateLinks(inquiry.id);
    } else {
      inquiry.status = InquiryStatus.PaymentRejected;
      // link stays active so the customer can re-upload
    }
    await this.repo.save(inquiry);
    await this.notifyCustomerRejected(inquiry);
    return inquiry;
  }

  // ─── Admin: cancel ───────────────────────────────────
  async adminCancel(ref: string, reason: string): Promise<Inquiry> {
    const inquiry = await this.findByRefOrFail(ref);
    if (inquiry.status === InquiryStatus.Cancelled) {
      throw new BadRequestException('This booking is already cancelled.');
    }
    inquiry.status = InquiryStatus.Cancelled;
    inquiry.cancelledBy = CancelledBy.Admin;
    inquiry.cancelReason = reason ?? '';
    await this.deactivateLinks(inquiry.id);
    return this.repo.save(inquiry);
  }

  // ─── Payment proof submission (called by PaymentsService) ──
  async submitProof(inquiry: Inquiry, file: UploadedProof): Promise<Inquiry> {
    if (!PAYABLE_STATUSES.includes(inquiry.status)) {
      throw new BadRequestException(
        `This booking is "${inquiry.status}" — no payment is expected right now.`,
      );
    }
    if (isPastDue(inquiry.paymentDueDate)) {
      throw new BadRequestException(
        'The payment due date has passed. Please submit a new inquiry.',
      );
    }
    const proof = this.proofRepo.create({
      inquiryId: inquiry.id,
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
    });
    await this.proofRepo.save(proof);

    inquiry.status = InquiryStatus.PaymentSubmitted;
    await this.repo.save(inquiry);
    await this.notifyAdminPaymentSubmitted(inquiry);
    return inquiry;
  }

  // ─── Payment link helpers ────────────────────────────
  async regenerateLink(inquiry: Inquiry): Promise<PaymentLink> {
    await this.deactivateLinks(inquiry.id);
    const expiresAt = inquiry.paymentDueDate
      ? new Date(inquiry.paymentDueDate)
      : addHours(new Date(), 24);
    const link = this.linkRepo.create({
      token: generatePaymentToken(),
      inquiryId: inquiry.id,
      expiresAt,
      isActive: true,
    });
    return this.linkRepo.save(link);
  }

  private async deactivateLinks(inquiryId: string): Promise<void> {
    await this.linkRepo.update({ inquiryId, isActive: true }, { isActive: false });
  }

  linkUrl(link: PaymentLink): string {
    return `${this.config.get('publicAppUrl')}/pay/${link.token}`;
  }

  // ─── Notifications ───────────────────────────────────
  private async adminEmail(): Promise<string> {
    const venue = await this.settings.getVenueInfo();
    return venue.email || this.config.get<string>('seed.adminEmail')!;
  }

  private async notifyAdminNewInquiry(inquiry: Inquiry) {
    const prefs = await this.settings.getNotificationPrefs();
    if (!prefs.newInquiry) return;
    await this.email.send({
      to: await this.adminEmail(),
      subject: `New inquiry ${inquiry.ref}`,
      text: `A new inquiry was submitted.\n\nRef: ${inquiry.ref}\nCustomer: ${inquiry.customerName} (${inquiry.customerEmail})\nDate: ${inquiry.date} ${inquiry.time}\nCategory: ${inquiry.category}\n\nOpen the admin dashboard to review.`,
    });
  }

  private async notifyAdminPaymentSubmitted(inquiry: Inquiry) {
    const prefs = await this.settings.getNotificationPrefs();
    if (!prefs.paymentSubmitted) return;
    await this.email.send({
      to: await this.adminEmail(),
      subject: `Payment submitted — ${inquiry.ref}`,
      text: `${inquiry.customerName} submitted proof of payment for ${inquiry.ref}. Review and approve/reject in the dashboard.`,
    });
  }

  private async notifyCustomerAwaitingPayment(
    inquiry: Inquiry,
    link: PaymentLink,
  ) {
    await this.email.send({
      to: inquiry.customerEmail,
      subject: `Complete your payment — ${inquiry.ref}`,
      text: `Your booking ${inquiry.ref} is ready for payment.\n\nAmount: Rp ${inquiry.agreedPrice?.toLocaleString('id-ID')}\nDue by: ${formatDueDate(inquiry.paymentDueDate)}\n\nPay & upload your proof here:\n${this.linkUrl(link)}\n\nIf payment isn't received by the due date, the booking is automatically cancelled.`,
    });
  }

  private async notifyCustomerConfirmed(inquiry: Inquiry) {
    await this.email.send({
      to: inquiry.customerEmail,
      subject: `Booking confirmed — ${inquiry.ref}`,
      text: `Great news! Your booking ${inquiry.ref} is confirmed. Our team will be in touch with the final details.`,
    });
  }

  private async notifyCustomerRejected(inquiry: Inquiry) {
    const cancelled = inquiry.status === InquiryStatus.Cancelled;
    await this.email.send({
      to: inquiry.customerEmail,
      subject: cancelled
        ? `Booking cancelled — ${inquiry.ref}`
        : `Payment needs attention — ${inquiry.ref}`,
      text: cancelled
        ? `Your booking ${inquiry.ref} was cancelled after ${inquiry.rejectionCount} rejected payment attempts. Reason: ${inquiry.rejectionReason}`
        : `Your payment for ${inquiry.ref} was rejected.\n\nReason: ${inquiry.rejectionReason}\nAttempt ${inquiry.rejectionCount} of ${this.maxRejections}.\n\nPlease re-upload a valid proof of payment.`,
    });
  }

  // ─── Cron support: auto-cancel past-due awaiting payments ──
  async autoCancelPastDue(): Promise<number> {
    const awaiting = await this.repo.find({
      where: { status: InquiryStatus.AwaitingPayment },
    });
    let cancelled = 0;
    for (const inquiry of awaiting) {
      if (isPastDue(inquiry.paymentDueDate)) {
        inquiry.status = InquiryStatus.Cancelled;
        inquiry.cancelledBy = CancelledBy.System;
        inquiry.cancelReason = 'Payment was not received by the due date.';
        await this.deactivateLinks(inquiry.id);
        await this.repo.save(inquiry);
        cancelled++;
      }
    }
    return cancelled;
  }
}
