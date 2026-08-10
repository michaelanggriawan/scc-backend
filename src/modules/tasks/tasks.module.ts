import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { InquiriesModule } from '../inquiries/inquiries.module';

@Module({
  imports: [InquiriesModule],
  providers: [TasksService],
})
export class TasksModule {}
