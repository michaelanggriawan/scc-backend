import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AddOn } from '../../entities/addon.entity';
import { EntityStatus } from '../../common/enums';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/addon.dto';

@Injectable()
export class AddOnsService {
  constructor(
    @InjectRepository(AddOn)
    private readonly repo: Repository<AddOn>,
  ) {}

  findAll(): Promise<AddOn[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive(): Promise<AddOn[]> {
    return this.repo.find({
      where: { status: EntityStatus.Active },
      order: { createdAt: 'DESC' },
    });
  }

  findByIds(ids: string[]): Promise<AddOn[]> {
    if (!ids || ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findById(id: string): Promise<AddOn> {
    const addon = await this.repo.findOne({ where: { id } });
    if (!addon) throw new NotFoundException('Add-on not found');
    return addon;
  }

  create(dto: CreateAddOnDto): Promise<AddOn> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateAddOnDto): Promise<AddOn> {
    const addon = await this.findById(id);
    Object.assign(addon, dto);
    return this.repo.save(addon);
  }

  async setStatus(id: string, status: EntityStatus): Promise<AddOn> {
    const addon = await this.findById(id);
    addon.status = status;
    return this.repo.save(addon);
  }

  async remove(id: string): Promise<void> {
    const addon = await this.findById(id);
    await this.repo.remove(addon);
  }
}
