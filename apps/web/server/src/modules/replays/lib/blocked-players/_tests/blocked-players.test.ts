import { describe, expect, it } from 'vitest';

import { parseReplaySummary } from '../../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../../lib/replay/_tests/fixtures';
import { anonymiseBlocked, summaryAccountIds } from '../blocked-players';

const PLACEHOLDER = 'anonymous';

const summary = parseReplaySummary(readFixture(FIXTURE.wgFull));
const recorderId = summary.recorder.accountId ?? 0;
const stranger = summary.players.find((player) => !player.isRecorder && player.accountId !== null);
const strangerId = stranger?.accountId ?? 0;

const isStranger = (vehicleId: number) => vehicleId === stranger?.vehicleId;

describe('summaryAccountIds', () => {
  it('lists the recorder', () => {
    expect(summaryAccountIds(summary)).toContain(recorderId);
  });

  it('lists every known player once', () => {
    const ids = summaryAccountIds(summary);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('anonymiseBlocked', () => {
  it('returns the summary untouched when nobody is blocked', () => {
    const scrubbed = anonymiseBlocked({ summary, blocked: new Set(), placeholder: PLACEHOLDER });

    expect(scrubbed).toBe(summary);
  });

  it('scrubs a blocked recorder like the purge does', () => {
    const scrubbed = anonymiseBlocked({ summary, blocked: new Set([recorderId]), placeholder: PLACEHOLDER });

    expect(scrubbed.recorder).toMatchObject({ accountId: null, name: PLACEHOLDER });
  });

  it('scrubs a blocked player like the purge does', () => {
    const scrubbed = anonymiseBlocked({ summary, blocked: new Set([strangerId]), placeholder: PLACEHOLDER });
    const scrubbedStranger = scrubbed.players.find((player) => isStranger(player.vehicleId));

    expect(scrubbedStranger).toMatchObject({ accountId: null, name: PLACEHOLDER, clanTag: null });
  });

  it('keeps players who are not blocked as they are', () => {
    const scrubbed = anonymiseBlocked({ summary, blocked: new Set([strangerId]), placeholder: PLACEHOLDER });
    const others = scrubbed.players.filter((player) => !isStranger(player.vehicleId));

    expect(others).toEqual(summary.players.filter((player) => !isStranger(player.vehicleId)));
  });
});
