import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddOn } from '../../entities/addon.entity';
import { AddOnsService } from './addons.service';
import {
  AdminAddOnsController,
  PublicAddOnsController,
} from './addons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AddOn])],
  providers: [AddOnsService],
  controllers: [AdminAddOnsController, PublicAddOnsController],
  exports: [AddOnsService],
})
export class AddOnsModule {}
