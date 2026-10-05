import type { ExpressionBuilder } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';
import type { Database } from '../../../core';
import type { TOURNAMENT_SEEDS_QUERIES } from './tournament-seeds.queries';

export type WriteParticipantSeedsInput = {
  db: Database;
  tournamentId: string;
  seededAccountIds: readonly number[];
};

export type SeedByOrderInput = {
  eb: ExpressionBuilder<DB, 'tournament_participant'>;
  accountIds: readonly number[];
};

export type TournamentSeedsQueries = typeof TOURNAMENT_SEEDS_QUERIES;
