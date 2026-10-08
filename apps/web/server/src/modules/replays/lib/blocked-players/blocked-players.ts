import { unique } from 'remeda';

import type { ReplayPlayer, ReplaySummary } from '../../../../lib/replay';
import type { AnonymiseBlockedInput } from './blocked-players.types';

export const summaryAccountIds = (summary: ReplaySummary): number[] => {
  const playerIds = summary.players.map((player) => player.accountId);
  const listedIds = [summary.recorder.accountId, ...playerIds];
  const knownIds = listedIds.filter((accountId) => accountId !== null);

  return unique(knownIds);
};

export const anonymiseBlocked = ({ summary, blocked, placeholder }: AnonymiseBlockedInput): ReplaySummary => {
  if (blocked.size === 0) {
    return summary;
  }

  const isBlocked = (accountId: number | null) => accountId !== null && blocked.has(accountId);
  const anonymisePlayer = (player: ReplayPlayer): ReplayPlayer => ({ ...player, accountId: null, name: placeholder, clanTag: null });

  const anonymisedRecorder = { ...summary.recorder, accountId: null, name: placeholder };
  const recorder = isBlocked(summary.recorder.accountId) ? anonymisedRecorder : summary.recorder;
  const players = summary.players.map((player) => (isBlocked(player.accountId) ? anonymisePlayer(player) : player));

  return { ...summary, recorder, players };
};
