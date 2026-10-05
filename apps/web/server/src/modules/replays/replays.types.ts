import type { ModReplayStatuses } from '@otmetki/schemas';
import type { z } from 'zod';

import type { Replay, Visibility } from '../../../generated';
import type { ReplaySummary } from '../../lib/replay';
import type { AuthenticatedDevice, SignedModRequest } from '../mod';
import type {
  bestOfWeekSchema,
  heatmapSchema,
  replayPageSchema,
  replaySearchQuerySchema,
  replayTracksSchema,
  replayVersionsSchema,
  uploadedReplaySchema
} from './dto/replays.schemas';
import type { ReplayExtension } from './lib/replay-file/replay-file.types';
import type { ReplayTrack } from './lib/replay-tracks/replay-tracks.types';

export type UploadedReplayFile = {
  originalname: string;
  size: number;
  buffer: Buffer;
};

export type UploadReplayInput = {
  file: UploadedReplayFile | undefined;
  uploaderUserId: string;
  deviceId: string | null;
  visibility: Visibility;
};

export type AcceptedReplay = {
  file: UploadedReplayFile;
  bytes: Uint8Array;
  extension: ReplayExtension;
  summary: ReplaySummary;
};

export type StoreReplayInput = Omit<UploadReplayInput, 'file'> & {
  replay: AcceptedReplay;
};

export type UploadFromModInput = {
  file: UploadedReplayFile | undefined;
  request: SignedModRequest;
};

export type ReplaySearchQuery = z.output<typeof replaySearchQuerySchema>;

export type ReplayVersions = z.infer<typeof replayVersionsSchema>;

export type TagBackfillOutcome = {
  tagged: number;
  skipped: number;
};

export type UploadedReplay = z.infer<typeof uploadedReplaySchema>;

export type ReplayPage = z.infer<typeof replayPageSchema>;

export type BestOfWeek = z.infer<typeof bestOfWeekSchema>;

export type ReplayTracks = z.infer<typeof replayTracksSchema>;

export type Heatmap = z.infer<typeof heatmapSchema>;

export type ViewReplayInput = {
  id: string;
  viewerUserId: string | null;
};

export type OwnReplayInput = {
  id: string;
  userId: string;
};

export type UpdateVisibilityInput = OwnReplayInput & {
  visibility: Visibility;
};

export type MineInput = {
  userId: string;
  limit: number;
  offset: number;
};

export type HeatmapQueryInput = {
  arenaId: string;
  mode: string;
  scope: string;
};

export type ApplyHeatmapInput = {
  replayId: string;
  arenaId: string;
  mode: string | null;
  tracks: readonly ReplayTrack[];
};

export type ReplayFile = {
  fileName: string;
  bytes: Uint8Array;
};

export type ParseReplayInput = {
  replayId: string;
  isFinalAttempt: boolean;
};

export type ParseOutcome = {
  status: 'failed' | 'missing' | 'parsed';
  hasTracks: boolean;
};

export type TracksOfInput = {
  bytes: Uint8Array;
  summary: ReplaySummary;
};

export type OverflowOwner = {
  userId: string;
  stored: number;
};

export type SettleOverflowInput = OverflowOwner & {
  accessEndedAt: Date;
  now: Date;
};

export type ReplayViewInput = {
  replay: Replay;
  viewerUserId?: string | null;
};

export type { ModReplayStatuses };

export type ModReplayStatusInput = {
  device: AuthenticatedDevice;
  replayIds: string[];
};

export type DiscardReplayInput = {
  id: string;
  storageKey: string;
};
