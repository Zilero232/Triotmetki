import { tz } from '@date-fns/tz';
import { getHours } from 'date-fns';
import { firstBy, sortBy } from 'remeda';

import type { QueueNow } from '../../map-stats.types';
import type { QueueNowInput, ZoneHourInput } from './queue-hours.types';

import { MAP_STATS } from '../../config/map-stats.constants';

export const zoneHour = ({ at, zone }: ZoneHourInput): number => getHours(at, { in: tz(zone) });

export const queueNow = ({ cells, hour, tier, minSamples }: QueueNowInput): QueueNow => {
  const reliable = cells.filter((cell) => cell.samples >= minSamples);
  const atHour = reliable.filter((cell) => cell.hour === hour);

  return {
    hour,
    selected: atHour.find((cell) => cell.tier === tier) ?? null,
    fastest:
      firstBy(
        reliable.filter((cell) => cell.tier === tier),
        (cell) => cell.medianSec,
        (cell) => cell.hour
      ) ?? null,
    tiers: sortBy(
      atHour.filter((cell) => cell.tier !== MAP_STATS.allTiers),
      (cell) => cell.tier
    )
  };
};
