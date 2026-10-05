import type { Database } from '../../../core';
import type { recordEvents, SNAPSHOT_EVENTS_QUERIES, tankEvents } from './snapshot-events.queries';

export type RecordEventsInput = {
  db: Database;
  accountIds: readonly number[];
  lookback: Date;
  since: Date;
  until: Date;
};

export type TankEventsInput = RecordEventsInput & {
  aceMastery: number;
};

export type TankEventRow = Awaited<ReturnType<typeof tankEvents>>[number];
export type RecordEventRow = Awaited<ReturnType<typeof recordEvents>>[number];

export type SnapshotEventsQueries = typeof SNAPSHOT_EVENTS_QUERIES;
