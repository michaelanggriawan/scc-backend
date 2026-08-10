import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums';
import { addDays } from '../../common/utils';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  private sign(user: User) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken: token,
      user: this.users.toPublic(user),
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.users.create({
      ...dto,
      role: UserRole.Customer,
    });
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await this.users.verifyPassword(user, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.sign(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    await this.users.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password updated' };
  }

  async forgotPassword(email: string) {
    const token = randomBytes(24).toString('base64url');
    const expiresAt = addDays(new Date(), 1);
    const user = await this.users.setResetToken(email, token, expiresAt);

    if (user) {
      const resetUrl = `${this.config.get('publicAppUrl')}/reset-password?token=${token}`;
      await this.email.send({
        to: user.email,
        subject: 'Reset your SCC password',
        text: `We received a request to reset your password.\n\nReset it here (valid 24h): ${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      });
    }
    // Always the same response — don't leak which emails exist.
    return {
      message: 'If that email is registered, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.users.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset. You can now log in.' };
  }
}
