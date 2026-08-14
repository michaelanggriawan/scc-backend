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
import { AddOnsService } from './addons.service';
import {
  CreateAddOnDto,
  ReorderAddOnsDto,
  UpdateAddOnDto,
  UpdateAddOnStatusDto,
} from './dto/addon.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Add-ons (Admin)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/addons')
export class AdminAddOnsController {
  constructor(private readonly addons: AddOnsService) {}

  @Get()
  findAll() {
    return this.addons.findAll();
  }

  @Post()
  create(@Body() dto: CreateAddOnDto) {
    return this.addons.create(dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderAddOnsDto) {
    return this.addons.reorder(dto.ids);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAddOnDto) {
    return this.addons.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateAddOnStatusDto) {
    return this.addons.setStatus(id, dto.status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.addons.remove(id);
    return { message: 'Add-on deleted' };
  }
}

@ApiTags('Add-ons (Public)')
@Controller('public/addons')
export class PublicAddOnsController {
  constructor(private readonly addons: AddOnsService) {}

  @Public()
  @Get()
  list() {
    return this.addons.findActive();
  }
}
