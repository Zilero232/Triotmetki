import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';

import type { UploadedReplayFile } from '../replays.types';

export type UploadRequest = Request & {
  session?: UserSession | null;
  file?: UploadedReplayFile;
};

export type ReleaseUploadInput = {
  slot: string;
  request: UploadRequest;
};
