import type { CallHandler } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';

import type { AuthenticatedDevice } from '../../mod';
import type { UploadedReplayFile } from '../replays.types';

export type UploadRequest = Request & {
  session?: UserSession | null;
  file?: UploadedReplayFile;
};

export type ModUploadRequest = UploadRequest & {
  modDevice?: AuthenticatedDevice;
};

export type UploadHandlerInput = {
  request: ModUploadRequest;
  next: CallHandler;
};

export type ReleaseUploadInput = {
  slot: string;
  request: UploadRequest;
};
