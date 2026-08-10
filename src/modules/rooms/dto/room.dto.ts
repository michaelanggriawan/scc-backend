import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EntityStatus } from '../../../common/enums';

const RoomSpecSchema = z.object({
  system: z.string(),
  spec: z.string(),
});

export const CreateRoomSchema = z
  .object({
    name: z.string().min(1).max(160),
    capacity: z.string().max(80).optional().default(''),
    area: z.string().max(80).optional().default(''),
    status: z.nativeEnum(EntityStatus).optional().default(EntityStatus.Active),
    description: z.string().max(4000).optional().default(''),
    facilities: z.array(z.string()).optional().default([]),
    specs: z.array(RoomSpecSchema).optional().default([]),
    photos: z.array(z.string()).optional().default([]),
    floorPlans: z.array(z.string()).optional().default([]),
    specPdfUrl: z.string().nullable().optional(),
  })
  .strict();
export class CreateRoomDto extends createZodDto(CreateRoomSchema) {}

export const UpdateRoomSchema = CreateRoomSchema.partial();
export class UpdateRoomDto extends createZodDto(UpdateRoomSchema) {}

export const UpdateStatusSchema = z
  .object({ status: z.nativeEnum(EntityStatus) })
  .strict();
export class UpdateStatusDto extends createZodDto(UpdateStatusSchema) {}
