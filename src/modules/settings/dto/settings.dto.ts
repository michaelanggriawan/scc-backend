import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const VenueInfoSchema = z
  .object({
    name: z.string().default(''),
    address: z.string().default(''),
    phone: z.string().default(''),
    email: z.string().default(''),
    whatsapp: z.string().default(''),
    instagram: z.string().optional().default(''),
    facebook: z.string().optional().default(''),
    linkedin: z.string().optional().default(''),
    youtube: z.string().optional().default(''),
    mapEmbedUrl: z.string().optional().default(''),
  })
  .strict();
export class VenueInfoDto extends createZodDto(VenueInfoSchema) {}

export const PaymentInfoSchema = z
  .object({
    bankName: z.string().default(''),
    accountNumber: z.string().default(''),
    accountName: z.string().default(''),
    qrImageUrl: z.string().nullable().optional().default(null),
    instructions: z.string().default(''),
  })
  .strict();
export class PaymentInfoDto extends createZodDto(PaymentInfoSchema) {}

export const NotificationPrefsSchema = z
  .object({
    newInquiry: z.boolean().default(true),
    paymentSubmitted: z.boolean().default(true),
    linkExpiringSoon: z.boolean().default(false),
    dailySummary: z.boolean().default(false),
  })
  .strict();
export class NotificationPrefsDto extends createZodDto(
  NotificationPrefsSchema,
) {}
