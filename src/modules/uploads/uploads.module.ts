import { Global, Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { AdminUploadsController } from './uploads.controller';
import { FilesController } from './files.controller';

@Global()
@Module({
  providers: [UploadsService],
  controllers: [AdminUploadsController, FilesController],
  exports: [UploadsService],
})
export class UploadsModule {}
