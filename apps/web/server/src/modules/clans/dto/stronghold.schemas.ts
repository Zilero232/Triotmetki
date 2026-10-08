import { z } from 'zod';

const optionalString = z.string().nullish().catch(null);
const optionalNumber = z.number().nullish().catch(null);

export const rawBuildingSchema = z
  .object({
    building_type: optionalString,
    type: optionalString,
    building_title: optionalString,
    title: optionalString,
    level: optionalNumber,
    position: optionalNumber,
    direction_name: optionalString,
    direction: optionalString,
    arena_id: z.union([z.string(), z.number()]).nullish().catch(null),
    reserve_title: optionalString,
    reserve_type: optionalString
  })
  .loose();

export const rawStrongholdSchema = z
  .object({
    command_center_arena_id: z.union([z.string(), z.number()]).nullish().catch(null),
    total_resource_amount: optionalNumber,
    building_slots: optionalNumber,
    buildings: z
      .union([z.array(rawBuildingSchema), z.record(z.string(), rawBuildingSchema)])
      .nullish()
      .catch(null),
    skirmish_statistics: z.record(z.string(), z.number().nullish()).nullish().catch(null)
  })
  .loose();
