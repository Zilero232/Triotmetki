import type { z } from 'zod';

import type { LestaId } from '../batching/batching.types';
import type { FieldList, LestaCallOptions, LestaFieldsOption, LestaParams } from '../client/client.types';

export type LestaGenericInput = LestaCallOptions & {
  fields?: FieldList;
  params?: LestaParams;
};

export type AccountSearchType = 'exact' | 'startswith';

export type AccountListInput = LestaCallOptions & {
  search: string | readonly string[];
  type?: AccountSearchType;
  limit?: number;
};

export type AccountIdsInput<F extends FieldList | undefined> = LestaCallOptions &
  LestaFieldsOption<F> & {
    accountIds: readonly LestaId[];
  };

export type AccountTanksInput<F extends FieldList | undefined> = AccountIdsInput<F> & {
  tankIds?: readonly LestaId[];
};

export type AccountTanksStatsInput<F extends FieldList | undefined> = LestaCallOptions &
  LestaFieldsOption<F> & {
    accountId: LestaId;
    tankIds?: readonly LestaId[];
    inGarage?: boolean;
  };

export type PerAccountInput<T> = {
  method: string;
  input: AccountTanksStatsInput<FieldList | undefined>;
  schema: z.ZodType<T>;
};

type TankMasteryDistribution = 'damage' | 'xp';

export type TankMasteryInput = LestaCallOptions & {
  tankIds: readonly LestaId[];
  distribution: TankMasteryDistribution;
  percentiles: readonly number[];
};

type LoginDisplay = 'page' | 'popup';

export type LoginUrlInput = {
  redirectUri: string;
  expiresAt?: number;
  display?: LoginDisplay;
  nofollow?: boolean;
};

export type ProlongateInput = {
  accessToken: string;
  expiresAt?: number;
};

export type LogoutInput = {
  accessToken: string;
};

type LoginCallbackSuccess = {
  status: 'ok';
  accessToken: string;
  accountId: number;
  nickname: string;
  expiresAt: number;
};

type LoginCallbackFailure = {
  status: 'error';
  code: string;
  message: string;
};

export type LoginCallbackResult = LoginCallbackFailure | LoginCallbackSuccess;

export type VehiclesInput<F extends FieldList | undefined> = LestaCallOptions &
  LestaFieldsOption<F> & {
    tankIds?: readonly LestaId[];
    nations?: readonly string[];
    types?: readonly string[];
    tiers?: readonly number[];
    pageNo?: number;
    limit?: number;
  };

type VehicleProfileModules = {
  engineId?: LestaId;
  gunId?: LestaId;
  radioId?: LestaId;
  suspensionId?: LestaId;
  turretId?: LestaId;
};

export type VehicleProfileInput<F extends FieldList | undefined> = LestaCallOptions &
  LestaFieldsOption<F> & {
    tankId: LestaId;
    profileId?: string;
    modules?: VehicleProfileModules;
  };

export type VehicleProfilesInput<F extends FieldList | undefined> = LestaCallOptions &
  LestaFieldsOption<F> & {
    tankIds: readonly LestaId[];
    orderBy?: string;
  };

export type IdListInput = LestaGenericInput & {
  ids?: readonly LestaId[];
};

export type ClanIdsInput<F extends FieldList | undefined> = LestaCallOptions &
  LestaFieldsOption<F> & {
    clanIds: readonly LestaId[];
    membersKey?: 'id';
  };

export type ClanListInput = LestaGenericInput & {
  search?: string;
  limit?: number;
  pageNo?: number;
};

export type RatingAccountsInput = LestaGenericInput & {
  type: string;
  accountIds: readonly LestaId[];
  date?: number;
};

export type RatingListInput = LestaCallOptions & {
  type: string;
  rankField: string;
  limit?: number;
  pageNo?: number;
  date?: number;
};

export type RatingNeighborsInput = LestaCallOptions & {
  type: string;
  rankField: string;
  accountId: LestaId;
  limit?: number;
  date?: number;
};

export type RatingDatesInput = LestaCallOptions & {
  type?: string;
  accountId?: LestaId;
};

export type ClanRatingClansInput = LestaGenericInput & {
  clanIds: readonly LestaId[];
  date?: number;
};
