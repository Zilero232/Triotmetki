import type { Overlay as OverlayView } from '@otmetki/schemas';

import { overlayConfigSchema } from '@otmetki/schemas';

import type { ToOverlayViewInput } from './overlay.types';

import { AppBadRequestException } from '../../../../common/exceptions';
import { toNumber } from '../../../../common/lib';
import { OVERLAY, OVERLAY_KIND_FROM_DB } from '../config/overlay.constants';

export const toOverlayView = ({ overlay, isPaused, webUrl }: ToOverlayViewInput): OverlayView => {
  const parsed = overlayConfigSchema.safeParse(overlay.config);

  if (!parsed.success) {
    throw new AppBadRequestException('VALIDATION_FAILED', `Overlay ${overlay.id} has an invalid config`);
  }

  return {
    id: overlay.id,
    name: overlay.name,
    kind: OVERLAY_KIND_FROM_DB[overlay.kind],
    accountId: overlay.accountId === null ? null : toNumber(overlay.accountId),
    config: parsed.data,
    publicUrl: new URL(OVERLAY.publicPath.replace('{publicKey}', overlay.publicKey), webUrl).href,
    isPaused,
    updatedAt: overlay.updatedAt.toISOString()
  };
};
