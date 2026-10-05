import type { PlaylistReason } from '@otmetki/schemas';

import { uniformFloat64 } from 'pure-rand/distribution/uniformFloat64';
import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus';
import { sortBy, sumBy } from 'remeda';

import type { BuildPlaylistInput, PlaylistCandidate, PlaylistPick } from './playlist.types';

import { PLAYLIST_RULES, PLAYLIST_SEED } from '../../config/playlist.constants';

const REASON_TESTS: Record<PlaylistReason, (candidate: PlaylistCandidate) => boolean> = {
  closeToMark: (candidate) =>
    candidate.moePercent !== null &&
    candidate.nextMarkPercent !== null &&
    candidate.nextMarkPercent - candidate.moePercent <= PLAYLIST_RULES.closeToMarkPercent,
  firstWin: (candidate) => candidate.isFirstWinAvailable,
  longUnplayed: (candidate) => candidate.daysSinceBattle !== null && candidate.daysSinceBattle >= PLAYLIST_RULES.longUnplayedDays,
  lowWinRate: (candidate) =>
    candidate.battles >= PLAYLIST_RULES.lowWinRateMinBattles && candidate.winRate !== null && candidate.winRate < PLAYLIST_RULES.lowWinRate,
  mission: (candidate) => candidate.isMission
};

const legacyRandom = (seed: number): (() => number) => {
  let state = Math.trunc(seed) >>> 0;

  return () => {
    state = (state + 1_831_565_813) >>> 0;

    let value = Math.imul(state ^ (state >>> 15), 1 | state);

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const seededRandom = (seed: number): (() => number) => {
  if (seed < PLAYLIST_SEED.pureRandFromDay) {
    return legacyRandom(seed);
  }

  const generator = xoroshiro128plus(Math.trunc(seed) | 0);

  return () => uniformFloat64(generator);
};

export const buildPlaylist = ({ candidates, size, reasons, seed }: BuildPlaylistInput): PlaylistPick[] => {
  const random = seededRandom(seed);

  const picks = candidates
    .filter((candidate) => candidate.tier >= PLAYLIST_RULES.minTier)
    .map((candidate) => ({ candidate, reasons: reasons.filter((reason) => REASON_TESTS[reason](candidate)) }))
    .filter((pick) => pick.reasons.length > 0)
    .map((pick) => ({ pick, score: sumBy(pick.reasons, (reason) => PLAYLIST_RULES.weights[reason]) + random() * PLAYLIST_RULES.jitter * 2 }));

  return sortBy(picks, [(entry) => entry.score, 'desc'])
    .slice(0, size)
    .map((entry) => entry.pick);
};
