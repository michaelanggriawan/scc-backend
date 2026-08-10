import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../../entities/room.entity';
import { RoomsService } from './rooms.service';
import {
  AdminRoomsController,
  PublicRoomsController,
} from './rooms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Room])],
  providers: [RoomsService],
  controllers: [AdminRoomsController, PublicRoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
