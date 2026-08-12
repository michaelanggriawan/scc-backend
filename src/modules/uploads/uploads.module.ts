import { Global, Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { AdminUploadsController } from './uploads.controller';

@Global()
@Module({
  providers: [UploadsService],
  controllers: [AdminUploadsController],
  exports: [UploadsService],
})
export class UploadsModule {}
