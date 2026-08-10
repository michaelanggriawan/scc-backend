import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(1).max(120),
    phone: z.string().max(40).optional(),
    company: z.string().max(120).optional(),
  })
  .strict();
export class RegisterDto extends createZodDto(RegisterSchema) {}

export const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();
export class LoginDto extends createZodDto(LoginSchema) {}

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .strict();
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

export const ForgotPasswordSchema = z
  .object({ email: z.string().email() })
  .strict();
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .strict();
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
