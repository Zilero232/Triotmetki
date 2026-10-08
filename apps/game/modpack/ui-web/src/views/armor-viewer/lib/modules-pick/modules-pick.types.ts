import type { ArmorState } from '../armor-protocol';

export type ModulesPickInput = { modules: ArmorState['modules']; turret?: number; gun?: number };

export type ModulesPickResult = { turret: number; gun: number };
