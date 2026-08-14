import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InquiriesService } from './inquiries.service';
import {
  AvailabilityQueryDto,
  AvailabilitySummaryQueryDto,
  CancelInquiryDto,
  CreateInquiryDto,
  ListInquiriesDto,
  MarkAwaitingPaymentDto,
  RejectPaymentDto,
  UpdateTermsDto,
} from './dto/inquiry.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EVENT_CATEGORIES, UserRole } from '../../common/enums';

// ─── Public: guests submit inquiries, list categories ──
@ApiTags('Inquiries (Public)')
@Controller('public')
export class PublicInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Public()
  @Get('event-categories')
  categories() {
    return EVENT_CATEGORIES;
  }

  @Public()
  @Get('inquiries/availability')
  availability(@Query() query: AvailabilityQueryDto) {
    return this.inquiries.getAvailability(query.roomId, query.date);
  }

  @Public()
  @Get('inquiries/availability-summary')
  availabilitySummary(@Query() query: AvailabilitySummaryQueryDto) {
    return this.inquiries.getAvailabilitySummary(
      query.roomId,
      query.from,
      query.to,
    );
  }

  @Public()
  @Post('inquiries')
  createGuest(@Body() dto: CreateInquiryDto) {
    return this.inquiries.create(dto);
  }
}

// ─── Customer: manage own bookings ─────────────────────
@ApiTags('Inquiries (Customer)')
@ApiBearerAuth()
@Controller('inquiries')
export class CustomerInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInquiryDto,
  ) {
    return this.inquiries.create(dto, userId);
  }

  @Get('mine')
  mine(@CurrentUser('userId') userId: string) {
    return this.inquiries.listMine(userId);
  }

  @Get(':ref')
  detail(@CurrentUser('userId') userId: string, @Param('ref') ref: string) {
    return this.inquiries.getMineByRef(ref, userId);
  }

  @Post(':ref/cancel')
  cancel(
    @CurrentUser('userId') userId: string,
    @Param('ref') ref: string,
    @Body() dto: CancelInquiryDto,
  ) {
    return this.inquiries.customerCancel(ref, userId, dto.reason);
  }
}

// ─── Admin: full inquiry management ────────────────────
@ApiTags('Inquiries (Admin)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/inquiries')
export class AdminInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Get()
  list(@Query() query: ListInquiriesDto) {
    return this.inquiries.adminList(query);
  }

  @Get(':ref')
  get(@Param('ref') ref: string) {
    return this.inquiries.adminGet(ref);
  }

  @Patch(':ref')
  updateTerms(@Param('ref') ref: string, @Body() dto: UpdateTermsDto) {
    return this.inquiries.updateTerms(ref, dto);
  }

  @Post(':ref/awaiting-payment')
  awaitingPayment(
    @Param('ref') ref: string,
    @Body() dto: MarkAwaitingPaymentDto,
  ) {
    return this.inquiries.markAwaitingPayment(ref, dto);
  }

  @Post(':ref/approve')
  approve(@Param('ref') ref: string) {
    return this.inquiries.approve(ref);
  }

  @Post(':ref/reject')
  reject(@Param('ref') ref: string, @Body() dto: RejectPaymentDto) {
    return this.inquiries.reject(ref, dto);
  }

  @Post(':ref/cancel')
  cancel(@Param('ref') ref: string, @Body() dto: CancelInquiryDto) {
    return this.inquiries.adminCancel(ref, dto.reason);
  }
}
