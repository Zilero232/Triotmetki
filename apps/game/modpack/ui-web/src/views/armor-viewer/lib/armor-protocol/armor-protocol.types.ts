import type * as z from 'zod/mini';

import type { ArmorMode } from '@/entities/armor/armor-map';

import type { armorStateSchema, armorStatusSchema } from './armor-protocol.schemas';

export type ArmorState = z.infer<typeof armorStateSchema>;
export type ArmorStatus = z.infer<typeof armorStatusSchema>;
export type ArmorTankRow = ArmorState['garage'][number];
export type ArmorModuleRow = ArmorState['modules']['turrets'][number];
export type ArmorCamera = ArmorState['cameras'][number];
export type ArmorLabels = ArmorState['labels'];

export type ArmorMessage =
  | { command: 'attacker'; cd: number }
  | { command: 'camera'; preset: string }
  | { command: 'close' }
  | { command: 'diag'; text: string }
  | { command: 'distance'; m: number }
  | { command: 'hover'; x: number; y: number }
  | { command: 'leave' }
  | { command: 'mode'; mode: ArmorMode }
  | { command: 'modules'; turret: number; gun: number }
  | { command: 'move'; dx: number; dy: number; dz: number }
  | { command: 'ready' }
  | { command: 'search'; text: string }
  | { command: 'shell'; index: number }
  | { command: 'site' }
  | { command: 'tank'; cd: number };

export type ParseWithInput<Schema extends z.ZodMiniType> = { schema: Schema; raw: string | null };
