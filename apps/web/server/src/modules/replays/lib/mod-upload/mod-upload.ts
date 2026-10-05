import type { ModVisibility, RecordedByInput } from './mod-upload.types';

import { REPLAY_UPLOAD } from '../../config/upload.constants';
import { modVisibilitySchema } from './mod-upload.schemas';

export const modVisibility = (header: string | undefined): ModVisibility | null => {
  if (header === undefined) {
    return REPLAY_UPLOAD.modDefaultVisibility;
  }

  const parsed = modVisibilitySchema.safeParse(header.trim().toLowerCase());

  return parsed.success ? parsed.data : null;
};

export const isRecordedBy = ({ summary, accountId }: RecordedByInput): boolean =>
  summary.recorder.accountId !== null && BigInt(summary.recorder.accountId) === accountId;
