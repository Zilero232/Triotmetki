import type { Prisma } from '../../../../generated';
import type { ClanInfo, ClanMember } from '../../../lib/lesta';
import type { OwnedProvince } from './lib/clan-provinces';
import type { ClanRosterDiff, CurrentMember } from './lib/clan-roster';
import type { ClanActivityRow } from './queries/clan-activity.types';

export type SyncClanInput = {
  clanId: number;
  info: ClanInfo | null;
  now: Date;
};

export type ClanFieldsInput = {
  info: ClanInfo | null;
  disbanded: boolean;
  membersCount: number;
  now: Date;
};

export type ClanSnapshotInput = {
  clanIds: readonly number[];
  infos: Record<string, ClanInfo | null>;
  now: Date;
};

export type ClanActivityInput = {
  clanIds: readonly number[];
  now: Date;
};

export type LestaOrEmptyInput = {
  method: string;
  call: () => Promise<Record<string, unknown>>;
};

export type ReplaceProvincesInput = {
  clanId: bigint;
  provinces: readonly OwnedProvince[];
};

export type RosterOfInput = {
  id: bigint;
  members: readonly ClanMember[];
};

export type ClanRoster = {
  current: CurrentMember[];
  diff: ClanRosterDiff;
  names: Map<number, string>;
};

export type WriteRosterInput = {
  id: bigint;
  info: ClanInfo | null;
  disbanded: boolean;
  roster: ClanRoster;
  events: Prisma.ClanMemberEventCreateManyInput[];
  now: Date;
};

export type AnnounceRosterInput = {
  clanId: number;
  info: ClanInfo | null;
  events: readonly Prisma.ClanMemberEventCreateManyInput[];
};

export type SnapshotSources = {
  infos: Record<string, ClanInfo | null>;
  globalmap: Record<string, unknown>;
  stronghold: Record<string, unknown>;
  provinces: Record<string, unknown>;
  activity: Map<number, ClanActivityRow>;
};

export type SnapshotClanInput = {
  clanId: number;
  sources: SnapshotSources;
  now: Date;
};

export type WriteStrongholdInput = {
  id: bigint;
  fort: unknown;
  now: Date;
};
