import { describe, expect, it } from 'vitest';

import type { AttendanceEntry, WorkspaceEvent } from '../../../api';

import {
  attendanceChanges,
  attendanceCounts,
  attendanceDraft,
  attendanceTone,
  canSyncAttendance,
  hasStarted,
  memberAttendance,
  splitEvents
} from '../attendance';

const entry = (accountId: number, status: AttendanceEntry['status']): AttendanceEntry => ({
  accountId,
  nickname: `P${accountId}`,
  status,
  source: 'manual'
});

const event = (id: string, startsAt: string, attendance: AttendanceEntry[] = [], endsAt: string | null = null): WorkspaceEvent => ({
  id,
  kind: 'clan_wars',
  title: id,
  startsAt,
  endsAt,
  remindAt: null,
  remindMinutesBefore: null,
  remindedAt: null,
  attendance
});

describe('attendanceCounts', () => {
  it('counts every status, zeros included', () => {
    expect(attendanceCounts([entry(1, 'attended'), entry(2, 'attended'), entry(3, 'declined')])).toEqual({
      invited: 0,
      confirmed: 0,
      declined: 1,
      attended: 2,
      absent: 0
    });
  });
});

describe('memberAttendance', () => {
  it('rates only the marked presence', () => {
    const events = [
      event('a', '2026-09-01T18:00:00Z', [entry(1, 'attended'), entry(2, 'absent')]),
      event('b', '2026-09-08T18:00:00Z', [entry(1, 'absent'), entry(2, 'confirmed')]),
      event('c', '2026-09-15T18:00:00Z', [entry(1, 'attended')])
    ];

    const rates = memberAttendance({ events, accountIds: [1, 2, 3] });

    expect(rates.get(1)).toEqual({ attended: 2, total: 3, rate: 2 / 3 });
    expect(rates.get(2)).toEqual({ attended: 0, total: 1, rate: 0 });
    expect(rates.get(3)).toEqual({ attended: 0, total: 0, rate: null });
  });
});

describe('attendanceDraft', () => {
  it('lists the roster with the current statuses, invited by default', () => {
    const rows = attendanceDraft({
      event: event('a', '2026-09-01T18:00:00Z', [entry(2, 'confirmed')]),
      members: [
        { accountId: 1, nickname: 'zeta', role: 'private' },
        { accountId: 2, nickname: 'Alpha', role: 'commander' }
      ]
    });

    expect(rows.map(({ accountId, status }) => [accountId, status])).toEqual([
      [2, 'confirmed'],
      [1, 'invited']
    ]);
  });
});

describe('attendanceChanges', () => {
  it('sends only the statuses that changed', () => {
    const rows = [
      { accountId: 1, nickname: 'a', role: 'private' as const, status: 'invited' as const },
      { accountId: 2, nickname: 'b', role: 'private' as const, status: 'confirmed' as const }
    ];

    expect(attendanceChanges({ rows, draft: { 1: 'attended', 2: 'confirmed' } })).toEqual([{ accountId: 1, status: 'attended' }]);
  });
});

describe('splitEvents', () => {
  const events = [
    event('old', '2026-09-01T18:00:00Z'),
    event('running', '2026-09-27T10:00:00Z', [], '2026-09-27T14:00:00Z'),
    event('next', '2026-09-29T18:00:00Z'),
    event('older', '2026-08-20T18:00:00Z')
  ];

  it('splits by the end time, soonest and latest first', () => {
    const { upcoming, past } = splitEvents({ events, now: new Date('2026-09-27T12:00:00Z') });

    expect(upcoming.map(({ id }) => id)).toEqual(['running', 'next']);
    expect(past.map(({ id }) => id)).toEqual(['old', 'older']);
  });

  it('treats everything as upcoming before the clock is known', () => {
    expect(splitEvents({ events, now: null }).past).toEqual([]);
  });
});

describe('hasStarted', () => {
  it('compares the start with now', () => {
    expect(hasStarted({ startsAt: '2026-09-27T10:00:00Z', now: new Date('2026-09-27T12:00:00Z') })).toBe(true);
    expect(hasStarted({ startsAt: '2026-09-28T10:00:00Z', now: new Date('2026-09-27T12:00:00Z') })).toBe(false);
    expect(hasStarted({ startsAt: '2026-09-27T10:00:00Z', now: null })).toBe(false);
  });
});

describe('canSyncAttendance', () => {
  const now = new Date('2026-09-27T12:00:00Z');
  const startsAt = '2026-09-27T10:00:00Z';

  it('syncs a clan wars event that has started', () => {
    expect(canSyncAttendance({ kind: 'clan_wars', startsAt, now })).toBe(true);
  });

  it('syncs a Stronghold event that has started', () => {
    expect(canSyncAttendance({ kind: 'stronghold', startsAt, now })).toBe(true);
  });

  it('does not sync a training, whose battles the game does not tell apart', () => {
    expect(canSyncAttendance({ kind: 'training', startsAt, now })).toBe(false);
  });

  it('does not sync an event that has not started yet', () => {
    expect(canSyncAttendance({ kind: 'clan_wars', startsAt: '2026-09-28T10:00:00Z', now })).toBe(false);
  });
});

describe('attendanceTone', () => {
  it('colours the attendance rate', () => {
    expect(attendanceTone(0.9)).toBe('good');
    expect(attendanceTone(0.6)).toBe('average');
    expect(attendanceTone(0.2)).toBe('bad');
    expect(attendanceTone(null)).toBe('steel');
  });
});
