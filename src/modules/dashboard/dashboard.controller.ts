import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Dashboard (Admin)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats() {
    return this.dashboard.stats();
  }

  @Get('chart')
  chart(@Query('year') year?: string) {
    return this.dashboard.chart(year ? parseInt(year, 10) : undefined);
  }

  @Get('export')
  async export(@Res() res: Response) {
    const csv = await this.dashboard.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inquiries.csv"');
    res.send(csv);
  }
}
