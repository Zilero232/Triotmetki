import { lightFormat } from 'date-fns';

import { formatClock, groupDigits, NUMBER_FORMAT } from '@/shared/lib/format-number';

import { REPLAY_FORMAT } from '../../config';

export const formatCount = (value: number | null): string => (value === null ? NUMBER_FORMAT.dash : groupDigits(value));

export const formatDuration = (seconds: number | null): string => (seconds === null ? NUMBER_FORMAT.dash : formatClock(seconds));

export const formatSize = (bytes: number): string => (bytes / REPLAY_FORMAT.bytesPerMegabyte).toFixed(1);

export const formatMoment = (epoch: number): string => lightFormat(epoch * REPLAY_FORMAT.millisecondsPerSecond, REPLAY_FORMAT.dateTime);
