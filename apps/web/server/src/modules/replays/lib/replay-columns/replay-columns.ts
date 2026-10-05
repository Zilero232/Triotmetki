import { unique } from 'remeda';

import type { ReplaySummary } from '../../../../lib/replay';
import type { ReplayColumns } from './replay-columns.types';

import { REPLAY_PARSE } from '../../config/parse.constants';

const toDate = (value: string): Date | null => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const replayPlayedAt = (summary: Pick<ReplaySummary, 'arenaCreatedAt' | 'startedAt'>): Date | null => {
  if (summary.arenaCreatedAt) {
    return toDate(summary.arenaCreatedAt);
  }

  return summary.startedAt ? toDate(`${summary.startedAt}${REPLAY_PARSE.moscowOffset}`) : null;
};

const toBigInt = (value: string | null): bigint | null => (value && /^\d+$/.test(value) ? BigInt(value) : null);

export const replayColumns = (summary: ReplaySummary): ReplayColumns => {
  const recorder = summary.players.find((player) => player.isRecorder) ?? null;
  const result = recorder?.result ?? null;
  const accountId = recorder?.accountId ?? summary.recorder.accountId;

  return {
    gameVersion: summary.clientVersion.label ?? summary.clientVersion.exe,
    arenaUniqueId: toBigInt(summary.arenaUniqueId),
    arenaId: summary.map.id,
    mapName: summary.map.name,
    battleType: summary.battleType === null ? null : String(summary.battleType),
    gameplayMode: summary.mode,
    accountId: accountId === null ? null : BigInt(accountId),
    tankId: recorder?.tankId ?? null,
    result: summary.outcome,
    damageDealt: result ? Math.round(result.damageDealt) : null,
    damageAssisted: result ? Math.round(result.assistRadio + result.assistTrack + result.assistStun) : null,
    frags: result ? Math.round(result.frags) : null,
    xp: result ? Math.round(result.xp) : null,
    playedAt: replayPlayedAt(summary),
    playerAccountIds: unique(summary.players.flatMap((player) => (player.accountId === null ? [] : [player.accountId]))).map(BigInt)
  };
};
