import type { ChangeVerdict } from '../change-verdict/change-verdict.types';
import type { NarrowInput, SummaryAnnouncement } from './supertest-summary.types';

export const tankVerdict = (verdicts: readonly ChangeVerdict[]): ChangeVerdict => {
  const buffs = verdicts.filter((verdict) => verdict === 'buff').length;
  const nerfs = verdicts.filter((verdict) => verdict === 'nerf').length;

  if (buffs === nerfs) {
    return 'neutral';
  }

  return buffs > nerfs ? 'buff' : 'nerf';
};

export const supertestTotals = (announcements: readonly SummaryAnnouncement[]) => {
  const tanks = announcements.flatMap((announcement) => announcement.tanks);
  const verdicts = tanks.flatMap((tank) => tank.changes.map((change) => change.verdict));

  return {
    announcements: announcements.length,
    tanks: new Set(tanks.map((tank) => tank.key)).size,
    buffs: verdicts.filter((verdict) => verdict === 'buff').length,
    nerfs: verdicts.filter((verdict) => verdict === 'nerf').length
  };
};

export const narrowToTanks = <T extends SummaryAnnouncement>({ announcements, tankIds }: NarrowInput<T>): T[] =>
  announcements.flatMap((announcement) => {
    const tanks = announcement.tanks.filter((tank) => tank.tankId !== null && tankIds.has(tank.tankId));

    return tanks.length === 0 ? [] : [{ ...announcement, tanks }];
  });
