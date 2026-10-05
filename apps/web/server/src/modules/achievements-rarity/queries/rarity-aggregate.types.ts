import type { Database } from '../../../core';
import type { rarityAggregateQueries } from './rarity-aggregate.queries';

export type TankOwnersInput = {
  db: Database;
};

export type RollupRow = {
  accountId: number;
  held: number;
  points: number;
  completion: number;
};

export type RollupValues = {
  account_id: number;
  held: number;
  points: number;
  completion: number;
};

export type UpdateRollupsInput = {
  db: Database;
  rows: readonly RollupRow[];
  computedAt: Date;
};

export type RarityAggregateQueries = typeof rarityAggregateQueries;

export type TankOwnersRow = Awaited<ReturnType<RarityAggregateQueries['tankOwners']>>[number];
