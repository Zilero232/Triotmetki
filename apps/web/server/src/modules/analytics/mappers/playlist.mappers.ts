import type { PlaylistItem } from '@otmetki/schemas';

import { differenceInCalendarDays } from 'date-fns';

import type { PlaylistCandidate } from '../lib/playlist/playlist.types';
import type { ToPlaylistCandidatesInput, ToPlaylistItemsInput } from './playlist.types';

import { percentOf } from '../../../common/lib';

export const toPlaylistCandidates = ({ tanks, catalog, markOf, taken, missionClasses, now }: ToPlaylistCandidatesInput): PlaylistCandidate[] =>
  tanks.flatMap((tank) => {
    const vehicle = catalog.get(tank.tankId)?.summary;
    const mark = markOf.get(tank.tankId);

    if (!vehicle) {
      return [];
    }

    return [
      {
        tankId: tank.tankId,
        tier: vehicle.tier,
        battles: tank.battles,
        winRate: percentOf({ value: tank.wins, by: tank.battles }),
        moePercent: mark?.moePercent ?? null,
        nextMarkPercent: mark?.nextMarkPercent ?? null,
        daysSinceBattle: tank.lastBattleAt ? differenceInCalendarDays(now, tank.lastBattleAt) : null,
        isFirstWinAvailable: !taken.has(tank.tankId),
        isMission: missionClasses.has(vehicle.type)
      }
    ];
  });

export const toPlaylistItems = ({ picks, catalog, markOf }: ToPlaylistItemsInput): PlaylistItem[] =>
  picks.flatMap(({ candidate, reasons }) => {
    const vehicle = catalog.get(candidate.tankId)?.summary;

    if (!vehicle) {
      return [];
    }

    return [
      {
        vehicle,
        reasons,
        battles: candidate.battles,
        winRate: candidate.winRate,
        moePercent: candidate.moePercent,
        nextMarkPercent: candidate.nextMarkPercent,
        damageToNextMark: markOf.get(candidate.tankId)?.damageToNextMark ?? null,
        daysSinceBattle: candidate.daysSinceBattle,
        isFirstWinAvailable: candidate.isFirstWinAvailable
      }
    ];
  });
