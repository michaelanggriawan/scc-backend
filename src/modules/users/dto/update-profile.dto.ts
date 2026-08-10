import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateProfileSchema = z
  .object({
    fullName: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    company: z.string().max(120).optional(),
    email: z.string().email().optional(),
  })
  .strict();

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
