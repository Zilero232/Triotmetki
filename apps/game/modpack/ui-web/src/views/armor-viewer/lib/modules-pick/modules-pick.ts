import type { ArmorModuleRow } from '../armor-protocol';
import type { ModulesPickInput, ModulesPickResult } from './modules-pick.types';

const activeCd = (rows: readonly ArmorModuleRow[]): number => rows.find((row) => row.active)?.cd ?? 0;

export const modulesPick = ({ modules, turret, gun }: ModulesPickInput): ModulesPickResult => ({
  turret: turret ?? activeCd(modules.turrets),
  gun: gun ?? activeCd(modules.guns)
});
