import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, In, Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
import { PaymentLink } from '../../entities/payment-link.entity';
import { PaymentProof } from '../../entities/payment-proof.entity';
import {
  AVAILABILITY_BLOCKING_STATUSES,
  CancelledBy,
  CUSTOMER_CANCELLABLE_STATUSES,
  EDITABLE_INQUIRY_STATUSES,
  InquiryStatus,
  PAYABLE_STATUSES,
} from '../../common/enums';
import {
  addHours,
  buildInquiryRef,
  daysBetweenDateStrs,
  formatDueDate,
  generatePaymentToken,
  hasFreeWindow,
  isPastDue,
  minutesToTime,
  parseDurationHours,
  parseTimeToMinutes,
  shiftDateStr,
} from '../../common/utils';

// Operating window used to judge whether a day still has room for a fresh
// booking ("partial") or is booked solid ("full") — mirrors the frontend's
// selectable slot range (the full day: any hour is fresh-bookable).
const DAY_START_MIN = 0; // 00:00
const DAY_END_MIN = 24 * 60; // midnight
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
  // Based on the highest existing sequence number, not the row count — a
  // count-based approach collides as soon as the refs for the year have any
  // gap (e.g. from a deleted row), since count+1 can land on a number that's
  // already taken.
  private async nextRef(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SCC-${year}-`;
    // The offset must be cast explicitly — an untyped parameter in
    // SUBSTRING(text FROM $1) makes Postgres resolve the regex-pattern
    // overload instead of the integer-position one, silently returning the
    // wrong value instead of erroring.
    const row = await this.repo
      .createQueryBuilder('i')
      .select(
        'MAX(CAST(SUBSTRING(i.ref FROM CAST(:offset AS INTEGER)) AS INTEGER))',
        'max',
      )
      .where('i.ref LIKE :like', { like: `${prefix}%` })
      .setParameter('offset', prefix.length + 1)
      .getRawOne<{ max: number | string | null }>();
    return buildInquiryRef(year, Number(row?.max ?? 0) + 1);
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
    const activeLink = await this.linkRepo.findOne({
      where: { inquiryId: inquiry.id, isActive: true },
      order: { createdAt: 'DESC' },
    });
    const paymentLink = activeLink
      ? {
          url: this.linkUrl(activeLink),
          expiresAt: activeLink.expiresAt,
          expired: isPastDue(activeLink.expiresAt),
        }
      : null;
    return { ...inquiry, room, addons, proofs, paymentLink };
  }

  // ─── Public: room availability for a date (booked ranges) ──
  async getAvailability(roomId: string, date: string) {
    await this.rooms.findById(roomId); // 404s if missing
    const prevDate = shiftDateStr(date, -1);
    const [inquiries, prevInquiries] = await Promise.all([
      this.repo.find({
        where: { roomId, date, status: In(AVAILABILITY_BLOCKING_STATUSES) },
      }),
      this.repo.find({
        where: { roomId, date: prevDate, status: In(AVAILABILITY_BLOCKING_STATUSES) },
      }),
    ]);
    const bookedRanges = inquiries
      .map((inq) => {
        const start = parseTimeToMinutes(inq.time);
        const hours = parseDurationHours(inq.duration);
        if (start == null || hours <= 0) return null;
        return { start: inq.time, end: minutesToTime(start + hours * 60) };
      })
      .filter((r): r is { start: string; end: string } => r !== null);
    // A booking from the day before that runs past midnight (e.g. 21:00 +4h)
    // still blocks the start of this day too.
    for (const inq of prevInquiries) {
      const start = parseTimeToMinutes(inq.time);
      const hours = parseDurationHours(inq.duration);
      if (start == null || hours <= 0) continue;
      const spillover = start + hours * 60 - DAY_END_MIN;
      if (spillover > 0) {
        bookedRanges.push({ start: '00:00', end: minutesToTime(spillover) });
      }
    }
    return { roomId, date, bookedRanges };
  }

  // ─── Public: per-date "full"/"partial" summary across a range ──
  // Lets the calendar gray out fully-booked days and flag partially-booked
  // ones without a round trip per date. Dates with no bookings at all are
  // omitted (the frontend treats "absent" as fully free).
  async getAvailabilitySummary(roomId: string, from: string, to: string) {
    await this.rooms.findById(roomId); // 404s if missing
    // Also fetch the day right before `from` — a booking that starts there
    // and runs past midnight still eats into `from`'s own free window.
    const queryFrom = shiftDateStr(from, -1);
    const inquiries = await this.repo.find({
      where: {
        roomId,
        date: Between(queryFrom, to),
        status: In(AVAILABILITY_BLOCKING_STATUSES),
      },
    });
    const byDate = new Map<string, { start: number; end: number }[]>();
    const push = (d: string, r: { start: number; end: number }) => {
      const ranges = byDate.get(d) ?? [];
      ranges.push(r);
      byDate.set(d, ranges);
    };
    for (const inq of inquiries) {
      const start = parseTimeToMinutes(inq.time);
      const hours = parseDurationHours(inq.duration);
      if (start == null || hours <= 0) continue;
      const end = start + hours * 60;
      push(inq.date, { start, end: Math.min(end, DAY_END_MIN) });
      if (end > DAY_END_MIN) {
        push(shiftDateStr(inq.date, 1), { start: 0, end: end - DAY_END_MIN });
      }
    }
    const dates: Record<string, 'full' | 'partial'> = {};
    for (const [date, ranges] of byDate) {
      if (date < from || date > to) continue; // queryFrom was only for spillover context
      dates[date] = hasFreeWindow(ranges, DAY_START_MIN, DAY_END_MIN, 60)
        ? 'partial'
        : 'full';
    }
    return { roomId, from, to, dates };
  }

  // Rejects a create() if the requested room/date/time/duration overlaps an
  // existing booking that's still holding its slot (see
  // AVAILABILITY_BLOCKING_STATUSES). Malformed time/duration is left for the
  // DTO/UI to catch elsewhere — this only ever blocks a genuine overlap.
  private async assertNoOverlap(
    roomId: string,
    date: string,
    time: string,
    duration: string,
  ) {
    const start = parseTimeToMinutes(time);
    const hours = parseDurationHours(duration);
    if (start == null || hours <= 0) return;
    const end = start + hours * 60; // minutes from `date`'s midnight; may exceed 1440

    // The booking can run past midnight into later days, and an existing
    // booking on the day before `date` can already spill into it — widen the
    // query to that full span (plus a day of padding on each side) and
    // compare everything on one shared timeline instead of just same-date.
    const lastDayOffset = Math.floor((end - 1) / 1440);
    const fromDate = shiftDateStr(date, -1);
    const toDate = shiftDateStr(date, lastDayOffset + 1);

    const existing = await this.repo.find({
      where: {
        roomId,
        date: Between(fromDate, toDate),
        status: In(AVAILABILITY_BLOCKING_STATUSES),
      },
    });
    for (const inq of existing) {
      const exStart0 = parseTimeToMinutes(inq.time);
      const exHours = parseDurationHours(inq.duration);
      if (exStart0 == null || exHours <= 0) continue;
      const offsetDays = daysBetweenDateStrs(date, inq.date);
      const exStart = exStart0 + offsetDays * 1440;
      const exEndUnwrapped = exStart0 + exHours * 60;
      const exEnd = exStart + exHours * 60;
      if (start < exEnd && exStart < end) {
        const endDayOffset = Math.floor((exEndUnwrapped - 1) / 1440);
        const exEndLabel =
          endDayOffset > 0
            ? `${minutesToTime(exEndUnwrapped - endDayOffset * 1440)} on ${shiftDateStr(inq.date, endDayOffset)}`
            : minutesToTime(exEndUnwrapped);
        throw new BadRequestException(
          `This room is already booked on ${inq.date} from ${inq.time} to ${exEndLabel}. Please choose a different time.`,
        );
      }
    }
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
      await this.assertNoOverlap(dto.roomId, dto.date, dto.time, dto.duration);
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
