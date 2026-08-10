import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { UploadsService } from '../uploads/uploads.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const fileBody = {
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

// ─── Public: tokenized pay page (no login required) ────
@ApiTags('Payments (Public link)')
@Controller('pay')
export class PublicPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly uploads: UploadsService,
  ) {}

  @Public()
  @Get(':token')
  view(@Param('token') token: string) {
    return this.payments.getByToken(token);
  }

  @Public()
  @Post(':token/proof')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  submit(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stored = this.uploads.save(file);
    return this.payments.submitProofByToken(token, stored);
  }
}

// ─── Customer: pay from Profile (logged-in) ────────────
@ApiTags('Payments (Customer)')
@ApiBearerAuth()
@Controller('inquiries')
export class CustomerPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly uploads: UploadsService,
  ) {}

  @Get(':ref/payment-info')
  info(@CurrentUser('userId') userId: string, @Param('ref') ref: string) {
    return this.payments.getPaymentInfoForRef(ref, userId);
  }

  @Post(':ref/proof')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  submit(
    @CurrentUser('userId') userId: string,
    @Param('ref') ref: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stored = this.uploads.save(file);
    return this.payments.submitProofByRef(ref, userId, stored);
  }
}
