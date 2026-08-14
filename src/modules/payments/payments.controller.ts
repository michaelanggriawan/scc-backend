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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const fileBody = {
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

// ─── Tokenized pay page — login required, must be the inquiry's own
// customer. The token alone isn't treated as sufficient authorization since
// links can end up forwarded/leaked; the account check is the real gate.
@ApiTags('Payments (Public link)')
@ApiBearerAuth()
@Controller('pay')
export class PublicPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly uploads: UploadsService,
  ) {}

  @Get(':token')
  view(@CurrentUser('userId') userId: string, @Param('token') token: string) {
    return this.payments.getByToken(token, userId);
  }

  @Post(':token/proof')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async submit(
    @CurrentUser('userId') userId: string,
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stored = await this.uploads.save(file);
    return this.payments.submitProofByToken(token, userId, stored);
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
  async submit(
    @CurrentUser('userId') userId: string,
    @Param('ref') ref: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stored = await this.uploads.save(file);
    return this.payments.submitProofByRef(ref, userId, stored);
  }
}
