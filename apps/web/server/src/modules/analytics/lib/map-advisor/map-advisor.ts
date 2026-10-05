import { sortBy } from 'remeda';

import type { HighlightInput, MapHighlights, WinRateDeltaInput } from './map-advisor.types';

import { MAP_ADVISOR } from '../../config/map-advisor.constants';

export const winRateDelta = ({ winRate, average }: WinRateDeltaInput): number | null =>
  winRate === null || average === null ? null : winRate - average;

export const mapHighlights = ({ maps }: HighlightInput): MapHighlights => {
  const eligible = maps.filter((map) => map.battles >= MAP_ADVISOR.minMapBattles && map.winRateDelta !== null);
  const ranked = sortBy(eligible, [(map) => map.winRateDelta ?? 0, 'asc']);

  return {
    weakMaps: ranked
      .filter((map) => (map.winRateDelta ?? 0) <= MAP_ADVISOR.weakDeltaPoints)
      .slice(0, MAP_ADVISOR.highlighted)
      .map((map) => map.arenaId),
    strongMaps: ranked
      .toReversed()
      .filter((map) => (map.winRateDelta ?? 0) >= MAP_ADVISOR.strongDeltaPoints)
      .slice(0, MAP_ADVISOR.highlighted)
      .map((map) => map.arenaId)
  };
};
