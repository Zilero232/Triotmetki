import { sortBy, sum, sumBy } from 'remeda';

import type { ActivityRow, BestHour, BestHoursInput, Sample } from './pulse-grid.types';

import { PULSE } from '../../config/pulse.constants';

export const activityGrid = (rows: readonly ActivityRow[]): number[][] => {
  const grid = Array.from({ length: PULSE.days }, () => Array.from<number>({ length: PULSE.hours }).fill(0));

  for (const row of rows) {
    const day = grid[row.weekday];

    if (day && row.hour >= 0 && row.hour < PULSE.hours) {
      day[row.hour] = (day[row.hour] ?? 0) + row.players;
    }
  }

  return grid;
};

export const bestHours = ({ grid, count }: BestHoursInput): BestHour[] => {
  const totals = Array.from({ length: PULSE.hours }, (_, hour) => sumBy(grid, (day) => day[hour] ?? 0));
  const all = sum(totals);

  if (all === 0) {
    return [];
  }

  const shares = totals.map((value, hour) => ({ hour, share: value / all }));

  return sortBy(shares, [(entry) => entry.share, 'desc'], (entry) => entry.hour).slice(0, count);
};

export const encodeSample = (sample: Sample): string => `${sample.at.getTime()}:${sample.players}`;

export const decodeSample = (value: string): Sample | null => {
  const [time, players] = value.split(':').map(Number);

  return Number.isFinite(time) && Number.isFinite(players) ? { at: new Date(time ?? 0), players: players ?? 0 } : null;
};
