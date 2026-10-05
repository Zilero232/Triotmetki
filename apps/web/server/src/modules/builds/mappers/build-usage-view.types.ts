import type { Shot } from '@otmetki/gamedata';
import type { BuildCohort, BuildMode, BuildOptions, BuildUsage, ProvisionOption } from '@otmetki/schemas';

import type { BuildUsageAggregate } from '../../../../generated';
import type { StoredBuildUsage } from '../../collector';

export type ShellInfo = {
  name: string;
  kind: string | null;
  isPremium: boolean;
};

export type ToBuildUsageInput = {
  row: BuildUsageAggregate | null;
  options: BuildOptions;
  shells: ReadonlyMap<number, ShellInfo>;
  mode: BuildMode;
  cohort: BuildCohort;
};

type ShellShot = Pick<Shot, 'isPremium' | 'kind' | 'shell' | 'shellId'>;

export type ShellInfoInput = {
  turrets: readonly { guns: readonly { shots: readonly ShellShot[] }[] }[];
};

export type HistoryEntryInput = {
  usage: BuildUsage;
  gameVersion: string;
  computedAt: string;
};

export type CatalogPicksInput = {
  usage: unknown;
  battles: number;
};

export type StoredPick = StoredBuildUsage['consumables'][number];

export type CatalogPicks = {
  equipment: StoredPick[];
  consumables: StoredPick[];
};

export type ResolvePicksInput = {
  picks: readonly StoredPick[];
  options: ReadonlyMap<number, ProvisionOption>;
};
