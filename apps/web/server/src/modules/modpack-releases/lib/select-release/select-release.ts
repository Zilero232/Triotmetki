import type { ModpackLatestRelease } from '@otmetki/schemas';

import type { SelectReleaseInput } from './select-release.types';

import { matchesGame } from '../game-match/game-match';
import { newestFirst } from '../release-order/release-order';

export const selectRelease = ({ index, game }: SelectReleaseInput): ModpackLatestRelease => {
  const [release = null] = newestFirst(index.releases.filter((candidate) => candidate.games.some((pattern) => matchesGame({ pattern, game }))));

  return { game, status: release ? 'compatible' : 'waiting', release };
};
