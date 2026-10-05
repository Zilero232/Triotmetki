import type { ModReplayHighlights, ModReplayStatus } from '@otmetki/schemas';

import type { ModReplayStatusRow } from '../selects/mod-replay-status.types';

import { percentOf } from '../../../common/lib';
import { toCount } from '../lib/count/count';
import { readStoredSummary } from '../lib/stored-summary/stored-summary';

const recorderResult = (summary: unknown) => readStoredSummary(summary)?.players.find((player) => player.isRecorder)?.result ?? null;

const toHighlights = (row: ModReplayStatusRow): ModReplayHighlights | null => {
  const result = recorderResult(row.summary);
  const highlights = {
    accuracy: result ? percentOf({ value: result.hits, by: result.shots }) : null,
    damage: toCount(row.damageDealt ?? result?.damageDealt),
    penetrations: toCount(result?.penetrations)
  };

  return Object.values(highlights).every((value) => value === null) ? null : highlights;
};

export const toModReplayStatus = (row: ModReplayStatusRow): ModReplayStatus => ({
  id: row.id,
  status: row.status,
  highlights: row.status === 'parsed' ? toHighlights(row) : null
});
