import type { AuthenticatedDevice } from '../mod';

export type BadgesReadInput = {
  accountIds: number[];
  now: Date;
};

export type SaveBadgePreferenceInput = {
  device: AuthenticatedDevice;
  visible: boolean;
};

export type ClaimBadgeQuotaInput = {
  deviceId: string;
  accountIds: readonly number[];
  now: Date;
};
