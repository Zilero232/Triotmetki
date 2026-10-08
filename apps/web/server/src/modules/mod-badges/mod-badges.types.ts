import type { AuthenticatedDevice } from '../mod';

export type BadgesReadInput = {
  accountIds: number[];
  now: Date;
};

export type ReportPresenceInput = {
  accountId: number;
  visible: boolean;
};

export type SaveBadgePreferenceInput = {
  device: AuthenticatedDevice;
  visible: boolean;
};

export type ClaimBadgeQuotaInput = {
  subject: string;
  accountIds: readonly number[];
  now: Date;
};

export type ClaimClientQuotaInput = {
  ip: string | undefined;
  accountIds: readonly number[];
  now: Date;
};

export type ClaimOwnPresenceInput = {
  ip: string | undefined;
  accountId: number;
  now: Date;
};

export type ClientQuotaKeysInput = {
  ip: string | undefined;
  prefix: string;
  now: Date;
};

export type ClaimQuotaKeysInput = {
  keys: readonly string[];
  accountIds: readonly number[];
  limit: number;
  now: Date;
};
