import type { REPLAY_UPLOAD } from '../../config/upload.constants';

export type ReplayExtension = (typeof REPLAY_UPLOAD.extensions)[number];

export type ReplayStorageKeyInput = {
  sha256: string;
  extension: ReplayExtension;
};
