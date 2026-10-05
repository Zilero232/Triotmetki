import { addDays, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { REPLAY_OVERFLOW } from '../../../config/overflow.constants';
import { overflowPlan, overflowReplayIds } from '../replay-overflow';

const accessEndedAt = new Date('2026-03-01T00:00:00Z');
const deleteAt = addDays(accessEndedAt, REPLAY_OVERFLOW.readOnlyDays);

describe('overflowPlan', () => {
  it('keeps the overflow read-only for 180 days after access ends', () => {
    expect(deleteAt).toEqual(new Date('2026-08-28T00:00:00Z'));
    expect(overflowPlan({ accessEndedAt, now: addDays(accessEndedAt, 1) })).toEqual({ kind: 'wait', deleteAt });
  });

  it('waits until the 14-day notice window opens', () => {
    expect(overflowPlan({ accessEndedAt, now: subDays(deleteAt, 15) }).kind).toBe('wait');
  });

  it('sends the 14-day notice once the window opens', () => {
    expect(overflowPlan({ accessEndedAt, now: subDays(deleteAt, 14) })).toEqual({ kind: 'notice', deleteAt, daysLeft: 14 });
    expect(overflowPlan({ accessEndedAt, now: subDays(deleteAt, 2) })).toEqual({ kind: 'notice', deleteAt, daysLeft: 14 });
  });

  it('switches to the last-day notice within a day of deletion', () => {
    expect(overflowPlan({ accessEndedAt, now: subDays(deleteAt, 1) })).toEqual({ kind: 'notice', deleteAt, daysLeft: 1 });
  });

  it('deletes exactly on the deadline', () => {
    expect(overflowPlan({ accessEndedAt, now: deleteAt })).toEqual({ kind: 'delete', deleteAt });
  });
});

describe('overflowReplayIds', () => {
  const replays = [
    { id: 'a', createdAt: new Date('2026-01-01T00:00:00Z') },
    { id: 'b', createdAt: new Date('2026-01-03T00:00:00Z') },
    { id: 'c', createdAt: new Date('2026-01-02T00:00:00Z') },
    { id: 'd', createdAt: new Date('2026-01-04T00:00:00Z') }
  ];

  it('keeps the newest and returns the rest oldest last', () => {
    expect(overflowReplayIds({ replays, keep: 2 })).toEqual(['c', 'a']);
  });

  it('returns nothing when the replays fit the quota', () => {
    expect(overflowReplayIds({ replays, keep: 4 })).toEqual([]);
  });

  it('returns nothing for an empty list', () => {
    expect(overflowReplayIds({ replays: [], keep: 50 })).toEqual([]);
  });
});
