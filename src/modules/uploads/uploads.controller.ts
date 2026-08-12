import {
  Controller,
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
import { UploadsService } from './uploads.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

const fileBody = {
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

@ApiTags('Uploads (Admin)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('room-photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  roomPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.save(file);
  }

  @Post('qr')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  qr(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.save(file);
  }
}
