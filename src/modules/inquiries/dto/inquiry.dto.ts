import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { InquiryStatus } from '../../../common/enums';

// ─── Customer: submit an inquiry ───────────────────────
export const CreateInquirySchema = z
  .object({
    customerName: z.string().min(1).max(120),
    customerEmail: z.string().email(),
    customerPhone: z.string().min(1).max(40),
    roomId: z.string().uuid(),
    addonIds: z.array(z.string().uuid()).optional().default([]),
    date: z.string().min(1).max(20),
    time: z.string().min(1).max(20),
    duration: z.string().min(1).max(40),
    category: z.string().min(1).max(120),
    notes: z.string().max(4000).optional().default(''),
  })
  .strict();
export class CreateInquiryDto extends createZodDto(CreateInquirySchema) {}

// ─── Customer / Admin: cancel ──────────────────────────
export const CancelInquirySchema = z
  .object({ reason: z.string().max(1000).optional().default('') })
  .strict();
export class CancelInquiryDto extends createZodDto(CancelInquirySchema) {}

// ─── Admin: edit deal terms ────────────────────────────
export const UpdateTermsSchema = z
  .object({
    roomId: z.string().uuid().nullable().optional(),
    addonIds: z.array(z.string().uuid()).optional(),
    agreedPrice: z.number().int().nonnegative().nullable().optional(),
    paymentDueDate: z.string().min(1).optional(), // ISO datetime
    adminNotes: z.string().max(4000).optional(),
  })
  .strict();
export class UpdateTermsDto extends createZodDto(UpdateTermsSchema) {}

// ─── Admin: move to Awaiting Payment (generates a payment link) ──
export const MarkAwaitingPaymentSchema = z
  .object({
    agreedPrice: z.number().int().nonnegative(),
    // ISO datetime; omit to default to 24h from now (when the link is generated)
    paymentDueDate: z.string().min(1).optional(),
    roomId: z.string().uuid().nullable().optional(),
    addonIds: z.array(z.string().uuid()).optional(),
    adminNotes: z.string().max(4000).optional(),
  })
  .strict();
export class MarkAwaitingPaymentDto extends createZodDto(
  MarkAwaitingPaymentSchema,
) {}

// ─── Admin: reject a submitted payment ─────────────────
export const RejectPaymentSchema = z
  .object({ reason: z.string().min(1).max(1000) })
  .strict();
export class RejectPaymentDto extends createZodDto(RejectPaymentSchema) {}

// ─── Public: check room availability for a date ────────
export const AvailabilityQuerySchema = z
  .object({
    roomId: z.string().uuid(),
    date: z.string().min(1).max(20),
  })
  .strict();
export class AvailabilityQueryDto extends createZodDto(
  AvailabilityQuerySchema,
) {}

// ─── Admin: list filters ───────────────────────────────
export const ListInquiriesSchema = z
  .object({
    status: z.nativeEnum(InquiryStatus).optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();
export class ListInquiriesDto extends createZodDto(ListInquiriesSchema) {}
