import type { z } from 'zod';

import type {
  armorAttackerGunSchema,
  armorAttackerSchema,
  armorGunModuleSchema,
  armorModelSchema,
  armorModulesSchema,
  armorPlateSchema,
  armorShellOptionSchema,
  armorTurretModuleSchema
} from './armor.schemas';

export type ArmorPlateData = z.infer<typeof armorPlateSchema>;
export type ArmorShellOptionData = z.infer<typeof armorShellOptionSchema>;
export type ArmorGunModuleData = z.infer<typeof armorGunModuleSchema>;
export type ArmorTurretModuleData = z.infer<typeof armorTurretModuleSchema>;
export type ArmorModulesData = z.infer<typeof armorModulesSchema>;
export type ArmorModelResponse = z.infer<typeof armorModelSchema>;
export type ArmorAttackerGunData = z.infer<typeof armorAttackerGunSchema>;
export type ArmorAttackerData = z.infer<typeof armorAttackerSchema>;
