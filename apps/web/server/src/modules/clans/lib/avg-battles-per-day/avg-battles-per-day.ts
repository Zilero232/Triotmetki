import { meanBy } from 'remeda';

import type { BattlesPerDaySnapshot } from './avg-battles-per-day.types';

import { roundTo } from '../../../../common/lib';

export const avgBattlesPerDay = (snapshots: readonly BattlesPerDaySnapshot[]): number | null => {
  const measured = snapshots.filter(
    (snapshot): snapshot is BattlesPerDaySnapshot & { battlesDelta: number } => snapshot.battlesDelta !== null && snapshot.membersCount > 0
  );

  if (measured.length === 0) {
    return null;
  }

  return roundTo({ value: meanBy(measured, (snapshot) => Math.max(0, snapshot.battlesDelta) / snapshot.membersCount), digits: 1 });
};
