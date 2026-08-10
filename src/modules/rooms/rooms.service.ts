import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../entities/room.entity';
import { EntityStatus, SPEC_SYSTEMS } from '../../common/enums';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly repo: Repository<Room>,
  ) {}

  findAll(): Promise<Room[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive(): Promise<Room[]> {
    return this.repo.find({
      where: { status: EntityStatus.Active },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Room> {
    const room = await this.repo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  create(dto: CreateRoomDto): Promise<Room> {
    // Ensure every production system has a spec row, matching the wireframe.
    const specs =
      dto.specs && dto.specs.length
        ? dto.specs
        : SPEC_SYSTEMS.map((system) => ({ system, spec: '' }));
    const room = this.repo.create({
      ...dto,
      specs,
      facilities: dto.facilities ?? [],
      photos: dto.photos ?? [],
      floorPlans: dto.floorPlans ?? [],
    });
    return this.repo.save(room);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findById(id);
    Object.assign(room, dto);
    return this.repo.save(room);
  }

  async setStatus(id: string, status: EntityStatus): Promise<Room> {
    const room = await this.findById(id);
    room.status = status;
    return this.repo.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findById(id);
    await this.repo.remove(room);
  }
}
