import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [InquiriesModule, RoomsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
