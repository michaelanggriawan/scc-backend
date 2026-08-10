import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import {
  NotificationPrefsDto,
  PaymentInfoDto,
  VenueInfoDto,
} from './dto/settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Settings (Admin)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('venue')
  getVenue() {
    return this.settings.getVenueInfo();
  }

  @Put('venue')
  saveVenue(@Body() dto: VenueInfoDto) {
    return this.settings.saveVenueInfo(dto);
  }

  @Get('payment')
  getPayment() {
    return this.settings.getPaymentInfo();
  }

  @Put('payment')
  savePayment(@Body() dto: PaymentInfoDto) {
    return this.settings.savePaymentInfo(dto);
  }

  @Get('notifications')
  getNotifs() {
    return this.settings.getNotificationPrefs();
  }

  @Put('notifications')
  saveNotifs(@Body() dto: NotificationPrefsDto) {
    return this.settings.saveNotificationPrefs(dto);
  }
}

@ApiTags('Settings (Public)')
@Controller('public')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Footer / map / contact info on the landing page.
  @Public()
  @Get('venue-info')
  venueInfo() {
    return this.settings.getVenueInfo();
  }
}
