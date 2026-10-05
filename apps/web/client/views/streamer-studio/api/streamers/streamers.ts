import type { CreateChallengeInput, Overlay, SaveStreamerSettingsInput, StreamerSettingsView } from '@otmetki/schemas';

import { createOverlaySchema, previewOverlaySchema, saveStreamerSettingsSchema, updateOverlaySchema } from '@otmetki/schemas';

import type {
  ActivateChallengeInput,
  ConnectableProvider,
  CreateOverlayInput,
  OverlayData,
  PreviewOverlayInput,
  StreamerChallenge,
  StreamerProfile,
  UpdateOverlayInput,
  UpsertStreamerProfileInput
} from '@/entities/streamer/streamer';

import {
  streamersControllerActivateChallenge,
  streamersControllerCancelChallenge,
  streamersControllerConnect,
  streamersControllerCreateChallenge,
  streamersControllerCreateOverlay,
  streamersControllerDisconnect,
  streamersControllerListChallenges,
  streamersControllerListOverlays,
  streamersControllerMySettings,
  streamersControllerPreviewOverlay,
  streamersControllerProfile,
  streamersControllerRemoveOverlay,
  streamersControllerSaveProfile,
  streamersControllerSaveSettings,
  streamersControllerSetPredictions,
  streamersControllerUpdateOverlay
} from '@/shared/api/generated';
import { SESSION_REQUEST } from '@/shared/api/http';
import { fromSdk, isNotFoundError } from '@/shared/api/source';

import type { SaveOverlayInput } from './streamers.types';

export const getMyStreamerProfile = (): Promise<StreamerProfile> => fromSdk(() => streamersControllerProfile(SESSION_REQUEST));

export const findMyStreamerProfile = async (): Promise<StreamerProfile | null> => {
  try {
    return await getMyStreamerProfile();
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const saveStreamerProfile = (input: UpsertStreamerProfileInput): Promise<StreamerProfile> =>
  fromSdk(() => streamersControllerSaveProfile({ ...SESSION_REQUEST, body: input }));

export const getOverlays = (): Promise<Overlay[]> => fromSdk(() => streamersControllerListOverlays(SESSION_REQUEST));

export const createOverlay = (input: CreateOverlayInput): Promise<Overlay> =>
  fromSdk(() => streamersControllerCreateOverlay({ ...SESSION_REQUEST, body: createOverlaySchema.parse(input) }));

export const updateOverlay = ({ id, ...patch }: UpdateOverlayInput): Promise<Overlay> =>
  fromSdk(() => streamersControllerUpdateOverlay({ ...SESSION_REQUEST, path: { id }, body: updateOverlaySchema.parse(patch) }));

export const removeOverlay = async (id: string): Promise<void> => {
  await fromSdk(() => streamersControllerRemoveOverlay({ ...SESSION_REQUEST, path: { id } }));
};

export const getChallenges = (): Promise<StreamerChallenge[]> => fromSdk(() => streamersControllerListChallenges(SESSION_REQUEST));

export const createChallenge = (input: CreateChallengeInput): Promise<StreamerChallenge> =>
  fromSdk(() => streamersControllerCreateChallenge({ ...SESSION_REQUEST, body: input }));

export const activateChallenge = ({ id, donorName }: ActivateChallengeInput): Promise<StreamerChallenge> =>
  fromSdk(() => streamersControllerActivateChallenge({ ...SESSION_REQUEST, path: { id }, body: { donorName } }));

export const cancelChallenge = (id: string): Promise<StreamerChallenge> =>
  fromSdk(() => streamersControllerCancelChallenge({ ...SESSION_REQUEST, path: { id } }));

export const connectIntegration = async (provider: ConnectableProvider): Promise<string> =>
  (await fromSdk(() => streamersControllerConnect({ ...SESSION_REQUEST, path: { provider } }))).url;

export const disconnectIntegration = async (provider: ConnectableProvider): Promise<void> => {
  await fromSdk(() => streamersControllerDisconnect({ ...SESSION_REQUEST, path: { provider } }));
};

export const setTwitchPredictions = async (enabled: boolean): Promise<void> => {
  await fromSdk(() => streamersControllerSetPredictions({ ...SESSION_REQUEST, body: { enabled } }));
};

export const saveOverlay = ({ id, values }: SaveOverlayInput): Promise<Overlay> => (id ? updateOverlay({ id, ...values }) : createOverlay(values));

export const previewOverlay = (input: PreviewOverlayInput): Promise<OverlayData> =>
  fromSdk(() => streamersControllerPreviewOverlay({ ...SESSION_REQUEST, body: previewOverlaySchema.parse(input) }));

export const getMyStreamerSettings = (): Promise<StreamerSettingsView> => fromSdk(() => streamersControllerMySettings(SESSION_REQUEST));

export const findMyStreamerSettings = async (): Promise<StreamerSettingsView | null> => {
  try {
    return await getMyStreamerSettings();
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const saveMyStreamerSettings = (input: SaveStreamerSettingsInput): Promise<StreamerSettingsView> =>
  fromSdk(() => streamersControllerSaveSettings({ ...SESSION_REQUEST, body: saveStreamerSettingsSchema.parse(input) }));
