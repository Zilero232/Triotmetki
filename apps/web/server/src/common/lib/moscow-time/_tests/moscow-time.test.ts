import { describe, expect, it } from 'vitest';

import { moscowCalendarDate, moscowDay, moscowDayStart, previousWeek, secondsUntilNextDay, weekWindow } from '../moscow-time';

describe('moscowDay', () => {
  it('rolls over to the next day at Moscow midnight, not UTC midnight', () => {
    expect(moscowDay(new Date('2026-03-10T20:59:59.999Z'))).toBe('2026-03-10');
    expect(moscowDay(new Date('2026-03-10T21:00:00.000Z'))).toBe('2026-03-11');
  });
});

describe('moscowDayStart', () => {
  it('returns the instant the Moscow day of the date began', () => {
    const start = moscowDayStart(new Date('2026-03-11T12:34:56.000Z'));

    expect(start.toISOString()).toBe('2026-03-10T21:00:00.000Z');
  });

  it('keeps a Moscow midnight as its own start', () => {
    const midnight = new Date('2026-03-10T21:00:00.000Z');

    expect(moscowDayStart(midnight)).toEqual(midnight);
  });

  it('returns a plain Date on the same Moscow day', () => {
    const date = new Date('2026-07-01T23:30:00.000Z');
    const start = moscowDayStart(date);

    expect(start.constructor).toBe(Date);
    expect(moscowDay(start)).toBe(moscowDay(date));
  });
});

describe('moscowCalendarDate', () => {
  it('keeps the Moscow calendar day as a UTC-midnight date for date columns', () => {
    const date = new Date('2026-03-10T22:30:00.000Z');

    expect(moscowCalendarDate(date).toISOString().slice(0, 10)).toBe(moscowDay(date));
    expect(moscowCalendarDate(date).getUTCHours()).toBe(0);
  });
});

describe('weekWindow', () => {
  it('starts at Moscow Monday midnight and lasts seven days', () => {
    const { start, end } = weekWindow(new Date('2026-09-24T12:00:00Z'));

    expect(start.toISOString()).toBe('2026-09-20T21:00:00.000Z');
    expect(start).toEqual(moscowDayStart(start));
    expect(end.getTime() - start.getTime()).toBe(7 * 86_400_000);
  });

  it('puts Monday 01:00 in Moscow into the new week although it is still Sunday in UTC', () => {
    const sundayUtc = new Date('2026-09-20T22:00:00Z');

    expect(weekWindow(sundayUtc).start.toISOString()).toBe('2026-09-20T21:00:00.000Z');
  });

  it('keys the week by its Moscow Monday as a UTC-midnight date', () => {
    const { start, weekStart } = weekWindow(new Date('2026-09-24T12:00:00Z'));

    expect(weekStart.toISOString().slice(0, 10)).toBe(moscowDay(start));
    expect(weekStart.getUTCHours()).toBe(0);
  });
});

describe('previousWeek', () => {
  it('ends where the current week starts', () => {
    const now = new Date('2026-09-24T10:00:00Z');

    expect(previousWeek(now).end.getTime()).toBe(weekWindow(now).start.getTime());
  });
});

describe('secondsUntilNextDay', () => {
  it('counts down to Moscow midnight', () => {
    expect(secondsUntilNextDay(new Date('2026-10-06T20:59:30.000Z'))).toBe(30);
  });

  it('waits a whole day right after midnight', () => {
    expect(secondsUntilNextDay(new Date('2026-10-06T21:00:00.000Z'))).toBe(24 * 60 * 60);
  });
});
