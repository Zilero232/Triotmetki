import type { CreateApplyRequestInput, ModSettingsExport, SettingsGroupKey, SettingsSource, SettingsValues } from '@otmetki/schemas';

import type { SettingsApplyRequest } from '../../../../generated';
import type { AuthenticatedDevice } from '../../mod';

export type SaveSettingsRequest = {
  profileId: string;
  userId: string | null;
  source: SettingsSource;
  values: SettingsValues;
  sourceUrls?: Partial<Record<SettingsGroupKey, string>>;
};

export type SaveMySettingsInput = Omit<SaveSettingsRequest, 'profileId' | 'userId'> & { userId: string };

export type SaveEditorialSettingsInput = Omit<SaveSettingsRequest, 'profileId' | 'source' | 'userId'> & { slug: string; userId: string };

export type ApplyRequestInput = CreateApplyRequestInput & { userId: string };

export type ModExportInput = {
  device: AuthenticatedDevice;
  body: ModSettingsExport;
};

export type ModApplyResultInput = {
  device: AuthenticatedDevice;
  id: string;
  status: 'applied' | 'rejected';
};

export type SetAnonymousInput = {
  userId: string;
  anonymousStats: boolean;
};

export type ApplyViewInput = Pick<SettingsApplyRequest, 'appliedAt' | 'createdAt' | 'groups' | 'id' | 'status'> & {
  slug: string;
};
