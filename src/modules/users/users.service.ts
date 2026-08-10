import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  company?: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException('Email is already registered');

    const user = this.repo.create({
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      fullName: input.fullName || '',
      phone: input.phone || '',
      company: input.company || '',
      role: input.role || UserRole.Customer,
      passwordChangedAt: new Date(),
    });
    return this.repo.save(user);
  }

  async updateProfile(
    id: string,
    patch: Partial<Pick<User, 'fullName' | 'phone' | 'company' | 'email'>>,
  ): Promise<User> {
    const user = await this.findById(id);
    if (patch.email && patch.email.toLowerCase() !== user.email) {
      const email = patch.email.toLowerCase();
      const clash = await this.findByEmail(email);
      if (clash) throw new BadRequestException('Email is already in use');
      user.email = email;
    }
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.phone !== undefined) user.phone = patch.phone;
    if (patch.company !== undefined) user.company = patch.company;
    return this.repo.save(user);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(id);
    const ok = await this.verifyPassword(user, currentPassword);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await this.repo.save(user);
  }

  async setResetToken(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    user.resetToken = token;
    user.resetTokenExpiresAt = expiresAt;
    return this.repo.save(user);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.repo.findOne({ where: { resetToken: token } });
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    await this.repo.save(user);
  }

  // Strip sensitive fields before returning to clients.
  toPublic(user: User) {
    const { passwordHash, resetToken, resetTokenExpiresAt, ...rest } = user;
    return rest;
  }
}
