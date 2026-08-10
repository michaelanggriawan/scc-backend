import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  UpdateRoomDto,
  UpdateStatusDto,
} from './dto/room.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums';

// ─── Admin ─────────────────────────────────────────────
@ApiTags('Rooms (Admin)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  findAll() {
    return this.rooms.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rooms.findById(id);
  }

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.rooms.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.rooms.setStatus(id, dto.status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.rooms.remove(id);
    return { message: 'Room deleted' };
  }
}

// ─── Public ────────────────────────────────────────────
@ApiTags('Rooms (Public)')
@Controller('public/rooms')
export class PublicRoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Public()
  @Get()
  list() {
    return this.rooms.findActive();
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.rooms.findById(id);
  }
}
