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
