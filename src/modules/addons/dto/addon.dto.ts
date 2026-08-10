import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EntityStatus } from '../../../common/enums';

export const CreateAddOnSchema = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(4000).optional().default(''),
    status: z.nativeEnum(EntityStatus).optional().default(EntityStatus.Active),
  })
  .strict();
export class CreateAddOnDto extends createZodDto(CreateAddOnSchema) {}

export const UpdateAddOnSchema = CreateAddOnSchema.partial();
export class UpdateAddOnDto extends createZodDto(UpdateAddOnSchema) {}

export const UpdateAddOnStatusSchema = z
  .object({ status: z.nativeEnum(EntityStatus) })
  .strict();
export class UpdateAddOnStatusDto extends createZodDto(
  UpdateAddOnStatusSchema,
) {}
