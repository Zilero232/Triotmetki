import type { ClanSnapshot, GlobalMapProvince } from '../../../../generated';

type StrongholdProvince = Pick<GlobalMapProvince, 'arenaId' | 'dailyRevenue' | 'name' | 'provinceId'>;

export type ToStrongholdInput = {
  clanId: number;
  level: number | null;
  stats: unknown;
  buildings: unknown;
  updatedAt: Date | null;
  elo: Pick<ClanSnapshot, 'eloRating10' | 'eloRating6' | 'eloRating8'>;
  provinces: StrongholdProvince[];
};
