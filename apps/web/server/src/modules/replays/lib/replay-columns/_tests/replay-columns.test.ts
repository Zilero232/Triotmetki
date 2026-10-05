import { describe, expect, it } from 'vitest';

import { parseReplaySummary } from '../../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../../lib/replay/_tests/fixtures';
import { REPLAY_PARSE } from '../../../config/parse.constants';
import { replayColumns, replayPlayedAt } from '../replay-columns';

const full = parseReplaySummary(readFixture(FIXTURE.wgFull));
const incomplete = parseReplaySummary(readFixture(FIXTURE.wgIncomplete));

describe('replayColumns', () => {
  it('takes the recorder result for the searchable columns', () => {
    const recorder = full.players.find((player) => player.isRecorder);
    const columns = replayColumns(full);

    expect(columns.tankId).toBe(recorder?.tankId);
    expect(columns.damageDealt).toBe(recorder?.result?.damageDealt);
    expect(columns.accountId).toBe(BigInt(full.recorder.accountId ?? 0));
    expect(columns.result).toBe(full.outcome);
  });

  it('keeps the arena unique id exact beyond 2^53', () => {
    expect(replayColumns(full).arenaUniqueId?.toString()).toBe(full.arenaUniqueId);
  });

  it('lists every known participant once', () => {
    const ids = replayColumns(full).playerAccountIds;

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(full.players.filter((player) => player.accountId !== null).length);
  });

  it('leaves result columns empty for a replay without battle results', () => {
    const columns = replayColumns(incomplete);

    expect(columns.damageDealt).toBeNull();
    expect(columns.xp).toBeNull();
    expect(columns.accountId).not.toBeNull();
  });
});

describe('replayPlayedAt', () => {
  it('prefers the UTC arena creation time', () => {
    expect(replayPlayedAt({ arenaCreatedAt: '2024-10-11T19:14:35.000Z', startedAt: '2024-10-11T21:14:48' })?.toISOString()).toBe(
      '2024-10-11T19:14:35.000Z'
    );
  });

  it('reads the local start time as Moscow time', () => {
    const date = replayPlayedAt({ arenaCreatedAt: null, startedAt: '2026-09-24T18:05:07' });

    expect(date?.getTime()).toBe(new Date(`2026-09-24T18:05:07${REPLAY_PARSE.moscowOffset}`).getTime());
  });

  it('returns null for an unreadable date', () => {
    expect(replayPlayedAt({ arenaCreatedAt: null, startedAt: 'garbage' })).toBeNull();
    expect(replayPlayedAt({ arenaCreatedAt: null, startedAt: null })).toBeNull();
  });
});
