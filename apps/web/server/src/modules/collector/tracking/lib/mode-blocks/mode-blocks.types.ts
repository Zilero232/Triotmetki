import type { StatsMode } from '../../../../../../generated';

export type ModeStatsMode = Extract<StatsMode, 'epic' | 'globalmap' | 'ranked' | 'strongholdDefense' | 'strongholdSkirmish'>;

export type ModeSources = Readonly<Record<ModeStatsMode, readonly string[]>>;

export type ModeBlockOfInput = {
  source: Readonly<Record<string, unknown>>;
  keys: readonly string[];
};
