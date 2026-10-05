import type { EquipmentItem } from '../../model/schemas';

export type LoadoutSlot = { kind: 'slot'; key: string; index: number; item: EquipmentItem };

export type LoadoutDivider = { kind: 'divider'; key: string };

export type LoadoutEntry = LoadoutDivider | LoadoutSlot;
