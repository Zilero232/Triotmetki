import type { Database } from '../../../../core';
import type { clanActivity } from './clan-activity.queries';

export type ClanActivityInput = {
  db: Database;
  clanIds: readonly number[];
  battlesSince: Date;
  activeSince: Date;
};

export type ClanActivityRow = Awaited<ReturnType<typeof clanActivity>>[number];
