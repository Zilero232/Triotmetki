import type { LatestSpecHistoryInput } from './latest-spec-history.types';

export const latestSpecHistory = ({ db, gameVersionId }: LatestSpecHistoryInput) =>
  db
    .selectFrom('vehicle_spec_history')
    .distinctOn('tank_id')
    .select(['tank_id as tankId', 'specs'])
    .where('game_version_id', '<>', gameVersionId)
    .orderBy('tank_id')
    .orderBy('captured_at', 'desc')
    .execute();
