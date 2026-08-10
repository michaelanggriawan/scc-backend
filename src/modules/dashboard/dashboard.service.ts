import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../entities/inquiry.entity';
import { EntityStatus, InquiryStatus } from '../../common/enums';
import { RoomsService } from '../rooms/rooms.service';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepo: Repository<Inquiry>,
    private readonly rooms: RoomsService,
  ) {}

  async stats() {
    const [all, rooms] = await Promise.all([
      this.inquiryRepo.find(),
      this.rooms.findAll(),
    ]);
    return {
      totalInquiries: all.length,
      awaitingPayment: all.filter((i) => i.status === InquiryStatus.AwaitingPayment).length,
      paymentSubmitted: all.filter((i) => i.status === InquiryStatus.PaymentSubmitted).length,
      confirmed: all.filter((i) => i.status === InquiryStatus.Confirmed).length,
      cancelled: all.filter((i) => i.status === InquiryStatus.Cancelled).length,
      activeRooms: rooms.filter((r) => r.status === EntityStatus.Active).length,
    };
  }

  // Inquiries created per month for a given year (defaults to current).
  async chart(year?: number) {
    const y = year ?? new Date().getFullYear();
    const all = await this.inquiryRepo.find();
    const counts = new Array(12).fill(0);
    for (const inq of all) {
      const created = new Date(inq.createdAt);
      if (created.getFullYear() === y) counts[created.getMonth()]++;
    }
    return {
      year: y,
      series: MONTHS.map((label, i) => ({ month: label, count: counts[i] })),
    };
  }

  async exportCsv(): Promise<string> {
    const all = await this.inquiryRepo.find({ order: { createdAt: 'DESC' } });
    const header = [
      'Ref', 'Customer', 'Email', 'Phone', 'Date', 'Time', 'Duration',
      'Category', 'Status', 'AgreedPrice', 'PaymentDueDate', 'RejectionCount',
      'CancelledBy', 'CreatedAt',
    ];
    const rows = all.map((i) =>
      [
        i.ref, i.customerName, i.customerEmail, i.customerPhone, i.date, i.time,
        i.duration, i.category, i.status, i.agreedPrice ?? '', i.paymentDueDate ?? '',
        i.rejectionCount, i.cancelledBy ?? '', i.createdAt?.toISOString?.() ?? '',
      ].map((v) => this.csvCell(v)),
    );
    return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private csvCell(value: any): string {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
}
