import { createHash } from 'node:crypto';

import type { ReplayExtension, ReplayStorageKeyInput } from './replay-file.types';

import { REPLAY_UPLOAD } from '../../config/upload.constants';

export const replayExtension = (fileName: string): ReplayExtension | null => {
  const lower = fileName.trim().toLowerCase();

  return REPLAY_UPLOAD.extensions.find((extension) => lower.endsWith(extension) && lower.length > extension.length) ?? null;
};

export const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export const replayStorageKey = ({ sha256, extension }: ReplayStorageKeyInput): string =>
  `${REPLAY_UPLOAD.keyPrefix}/${sha256.slice(0, 2)}/${sha256}${extension}`;

export const tracksStorageKey = (storageKey: string): string => `${storageKey}${REPLAY_UPLOAD.tracksSuffix}`;
