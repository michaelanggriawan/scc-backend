import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InquiriesService } from '../inquiries/inquiries.service';

// Background jobs. The due-date sweep mirrors the wireframe's rule that an
// unpaid "Awaiting Payment" booking auto-cancels once its due date passes.
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly inquiries: InquiriesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepPastDue() {
    const cancelled = await this.inquiries.autoCancelPastDue();
    if (cancelled > 0) {
      this.logger.log(`Auto-cancelled ${cancelled} past-due booking(s).`);
    }
  }
}
