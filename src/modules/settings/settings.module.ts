import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '../../entities/setting.entity';
import { SettingsService } from './settings.service';
import {
  AdminSettingsController,
  PublicSettingsController,
} from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingsService],
  controllers: [AdminSettingsController, PublicSettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
