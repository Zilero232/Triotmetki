import { formatSeconds } from '@/shared/lib/format-number';

import type { SixthSenseData } from '../../model/schemas';
import type { LampView } from './lamp-view.types';

import { SIXTH_SENSE } from '../../config';

const secondsLeft = (data: SixthSenseData): number => Math.max(0, data.duration - data.elapsed);

const ringProgress = (data: SixthSenseData): number => {
  const left = secondsLeft(data);

  return data.held || left < SIXTH_SENSE.ring.minSeconds ? 0 : left / data.duration;
};

export const lampView = (data: SixthSenseData): LampView => {
  const left = secondsLeft(data);

  return {
    ring: data.size + SIXTH_SENSE.ring.padding,
    progress: ringProgress(data),
    seconds: data.timer && left > 0 ? formatSeconds(left) : '',
    alpha: data.dim ? SIXTH_SENSE.dimAlpha : 1,
    tone: data.color === null ? 'text' : null,
    lit: !data.dim && (data.held || (data.duration > 0 && data.elapsed < data.duration)),
    color: data.color === null ? undefined : { color: data.color }
  };
};
