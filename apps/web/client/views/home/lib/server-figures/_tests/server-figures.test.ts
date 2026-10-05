import { describe, expect, it } from 'vitest';

import { isActivityStale, serverFiguresState } from '../server-figures';

const SETTLED = { isPending: false, isError: false, trackedPlayers: null, online: null } as const;

describe('serverFiguresState', () => {
  it('reports an error before anything else', () => {
    expect(serverFiguresState({ ...SETTLED, isPending: true, isError: true })).toBe('error');
  });

  it('stays pending while the pulse is loading', () => {
    expect(serverFiguresState({ ...SETTLED, isPending: true })).toBe('pending');
  });

  it('treats zero tracked players and no online figure as no data yet', () => {
    expect(serverFiguresState({ ...SETTLED, trackedPlayers: 0 })).toBe('empty');
  });

  it('treats a zero online figure as no data yet', () => {
    expect(serverFiguresState({ ...SETTLED, trackedPlayers: 0, online: 0 })).toBe('empty');
  });

  it('is ready once players are tracked', () => {
    expect(serverFiguresState({ ...SETTLED, trackedPlayers: 1 })).toBe('ready');
  });

  it('is ready when only the server online figure is known', () => {
    expect(serverFiguresState({ ...SETTLED, online: 1 })).toBe('ready');
  });
});

describe('isActivityStale', () => {
  const NOW = new Date('2026-10-05T12:00:00Z');

  it('trusts a fresh hour with active players', () => {
    expect(isActivityStale({ activePlayers: 120, lastActiveAt: '2026-10-05T11:30:00Z', now: NOW })).toBe(false);
  });

  it('flags a pulse the collector stopped updating', () => {
    expect(isActivityStale({ activePlayers: 120, lastActiveAt: '2026-10-05T08:00:00Z', now: NOW })).toBe(true);
  });

  it('flags an hour with nobody active as missing data', () => {
    expect(isActivityStale({ activePlayers: 0, lastActiveAt: '2026-10-05T11:30:00Z', now: NOW })).toBe(true);
  });

  it('waits for the browser clock before judging the age', () => {
    expect(isActivityStale({ activePlayers: 120, lastActiveAt: '2026-10-01T08:00:00Z', now: null })).toBe(false);
  });
});
