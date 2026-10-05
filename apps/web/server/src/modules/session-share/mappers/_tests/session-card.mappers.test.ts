import { describe, expect, it } from 'vitest';

import type { SessionCardRow } from '../../selects/session-share.selects';

import { toSessionCard } from '../session-card.mappers';

const row: SessionCardRow = {
  id: '3f0a4d5e-6b7c-4d8e-9f0a-1b2c3d4e5f60',
  accountId: 12_345_678n,
  battles: 8,
  wins: 5,
  damageDealt: 20_000,
  wn8: 2150.5,
  player: { nickname: 'Tanker' }
};

describe('toSessionCard', () => {
  it('builds the session report the notification copy renders', () => {
    expect(toSessionCard(row)).toEqual({
      event: 'sessionFinished',
      accountId: 12_345_678,
      nickname: 'Tanker',
      sessionId: row.id,
      battles: row.battles,
      winRate: row.wins / row.battles,
      avgDamage: row.damageDealt / row.battles,
      wn8: row.wn8
    });
  });

  it('has no card for a session without battles', () => {
    expect(toSessionCard({ ...row, battles: 0, wins: 0, damageDealt: 0 })).toBeNull();
  });
});
