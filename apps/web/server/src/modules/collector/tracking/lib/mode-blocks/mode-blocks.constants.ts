import type { CareerMode } from '@otmetki/schemas';

import { keys } from 'remeda';

import type { ModeSources, ModeStatsMode } from './mode-blocks.types';

export const ACCOUNT_MODE_SOURCES = {
  strongholdSkirmish: ['stronghold_skirmish'],
  strongholdDefense: ['stronghold_defense'],
  globalmap: ['globalmap_absolute', 'globalmap_middle', 'globalmap_champion'],
  epic: ['epic'],
  ranked: ['ranked_battles']
} as const satisfies ModeSources;

export const TANK_MODE_SOURCES = {
  strongholdSkirmish: ['stronghold_skirmish'],
  strongholdDefense: ['stronghold_defense'],
  globalmap: ['globalmap'],
  epic: ['epic'],
  ranked: ['ranked_battles']
} as const satisfies ModeSources;

export const MODE_STATS_SQL = {
  strongholdSkirmish: 'stronghold_skirmish',
  strongholdDefense: 'stronghold_defense',
  globalmap: 'globalmap',
  epic: 'epic',
  ranked: 'ranked'
} as const satisfies Record<ModeStatsMode, string>;

export const CAREER_MODE_FROM_DB = {
  epic: 'frontline',
  ranked: 'ranked',
  strongholdSkirmish: 'strongholdSkirmish',
  strongholdDefense: 'strongholdDefense',
  globalmap: 'globalmap'
} as const satisfies Record<ModeStatsMode, CareerMode>;

export const MODE_STATS_MODES = keys(MODE_STATS_SQL);
