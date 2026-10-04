import type { SixthSenseData } from '../../model/schemas';
import type { LampView } from './lamp-view.types';

import { formatSeconds } from '../../../../../shared/lib/hud-format';
import { SIXTH_SENSE } from '../../config';

export const lampView = (data: SixthSenseData): LampView => {
  const left = Math.max(0, data.duration - data.elapsed);

  return {
    ring: data.size + SIXTH_SENSE.ring.padding,
    progress: data.duration > 0 ? left / data.duration : 0,
    seconds: data.timer ? formatSeconds(left) : '',
    alpha: data.dim ? SIXTH_SENSE.dimAlpha : 1,
    tone: data.color === null ? 'text' : null,
    lit: !data.dim && data.duration > 0 && data.elapsed < data.duration,
    color: data.color === null ? undefined : { color: data.color }
  };
};
