import type { PageWindow } from '../../common/lib';

export type ClanEventsInput = {
  clanId: bigint;
  limit: number;
  offset: number;
};

export type ClanEventPageInput = {
  clanId: bigint;
  window: PageWindow;
};
