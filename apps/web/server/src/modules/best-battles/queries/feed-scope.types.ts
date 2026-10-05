import type { QueryCreator } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';

export type FeedScope = {
  since: Date;
  battleTypes: readonly string[];
  tankIds: readonly number[] | null;
  arenaId?: string;
  medal?: string;
};

export type ScopedBattlesInput = FeedScope & {
  db: QueryCreator<DB>;
};
