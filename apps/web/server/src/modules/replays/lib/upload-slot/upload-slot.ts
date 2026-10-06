import type { ClaimUploadSlotInput, ReleaseUploadSlotInput } from './upload-slot.types';

import { UPLOAD_SLOT_SCRIPTS } from './upload-slot.constants';

export const claimUploadSlot = async ({ redis, key, limit, ttlSeconds }: ClaimUploadSlotInput): Promise<boolean> => {
  const claimed = await redis.eval(UPLOAD_SLOT_SCRIPTS.claim, 1, key, limit, ttlSeconds);

  return Number(claimed) === 1;
};

export const releaseUploadSlot = async ({ redis, key }: ReleaseUploadSlotInput): Promise<void> => {
  await redis.eval(UPLOAD_SLOT_SCRIPTS.release, 1, key);
};
