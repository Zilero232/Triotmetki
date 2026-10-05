import type {
  AccountEconomyQuery,
  CreateVehicleSourceInput,
  TankDetailQuery,
  TankEconomyQuery,
  TankServerStatsQuery,
  TankTraits,
  TankTraitsFilter,
  TankTrendQuery,
  TopPlayersQuery
} from '@otmetki/schemas';

import type { CatalogEntry, SpecTraits } from '../reference';
import type { UsageActor } from '../usage';

export type TankStatsListInput = TankServerStatsQuery;

export type TopPlayersInput = {
  tankId: number;
  query: TopPlayersQuery;
};

export type TankDetailInput = {
  idOrSlug: string;
  query: TankDetailQuery;
};

export type TankTrendInput = {
  tankId: number;
  query: TankTrendQuery;
};

export type TrendRow = {
  day: string;
  battles: number;
  wins: number;
  damage: number;
  players: number | null;
};

export type TraitsEntry = {
  spec: SpecTraits;
  hasOffers: boolean;
  traits: TankTraits;
};

export type TankEconomyListInput = TankEconomyQuery;

export type AccountEconomyRequest = {
  userId: string;
  query: AccountEconomyQuery;
};

export type MyLearningInput = {
  userId: string;
  tankId: number;
};

export type FilterByTraitsInput = {
  entries: readonly CatalogEntry[];
  filter: TankTraitsFilter;
};

export type AccountEconomyLookup = {
  accountId: bigint;
  days: number;
};

export type AccountLearningLookup = {
  accountId: bigint;
  tankId: number;
};

export type CreateVehicleSourceRequest = {
  userId: string;
  input: CreateVehicleSourceInput;
};

export type OpenArmorInput = {
  idOrSlug: string;
  actor: UsageActor;
};
