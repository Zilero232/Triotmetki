import type { createOverlaySchema, overlayDataSchema, previewOverlaySchema, updateOverlaySchema } from '@otmetki/schemas';
import type { z } from 'zod';

import type { Overlay } from '../../../../generated';

export type CreateOverlayInput = z.infer<typeof createOverlaySchema> & { userId: string };
export type UpdateOverlayInput = z.infer<typeof updateOverlaySchema> & { userId: string; id: string };
export type OverlayData = z.infer<typeof overlayDataSchema>;
export type PreviewOverlayRequest = z.infer<typeof previewOverlaySchema> & { userId: string };

export type OwnedInput = {
  userId: string;
  id: string;
};

export type BuildOverlayDataInput = Omit<CreateOverlayInput, 'accountId'> & {
  accountId: bigint | null;
};

export type AccountTankInput = {
  accountId: bigint;
  tankId: number;
};

export type AssertAccountInput = {
  userId: string;
  accountId: number | undefined;
};

export type OverlayViewInput = {
  overlay: Overlay;
  isPaused: boolean;
};
