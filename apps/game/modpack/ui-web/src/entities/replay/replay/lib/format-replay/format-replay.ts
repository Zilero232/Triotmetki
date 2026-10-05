import { lightFormat } from 'date-fns';

import { REPLAY_FORMAT } from '../../config';

export const formatCount = (value: number | null): string =>
  value === null ? REPLAY_FORMAT.dash : String(Math.round(value)).replace(REPLAY_FORMAT.groupPattern, REPLAY_FORMAT.thinSpace);

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null) {
    return REPLAY_FORMAT.dash;
  }

  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / REPLAY_FORMAT.secondsPerMinute);

  return `${minutes}:${String(whole % REPLAY_FORMAT.secondsPerMinute).padStart(2, '0')}`;
};

export const formatSize = (bytes: number): string => (bytes / REPLAY_FORMAT.bytesPerMegabyte).toFixed(1);

export const formatMoment = (epoch: number): string => lightFormat(epoch * REPLAY_FORMAT.millisecondsPerSecond, REPLAY_FORMAT.dateTime);

export const romanTier = (tier: number | null): string | null => (tier === null ? null : (REPLAY_FORMAT.romanTiers[tier - 1] ?? null));
