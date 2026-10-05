import { describe, expect, it } from 'vitest';

import { toStoredStandings } from '../league-entry.mappers';

describe('toStoredStandings', () => {
  it('orders a closed group by its stored places', () => {
    const rows = toStoredStandings([
      { accountId: 2n, rank: 2, battles: 10, value: 900, zone: 'stay' },
      { accountId: 1n, rank: 1, battles: 10, value: 1_000, zone: 'promotion' }
    ]);

    expect(rows.map((row) => row.accountId)).toEqual([1n, 2n]);
  });

  it('puts rows without a place last and keeps the places positive', () => {
    const rows = toStoredStandings([
      { accountId: 3n, rank: null, battles: 0, value: null, zone: null },
      { accountId: 1n, rank: 1, battles: 10, value: 1_000, zone: 'stay' }
    ]);

    expect(rows.at(-1)).toMatchObject({ accountId: 3n, rank: 2, zone: 'stay' });
  });
});
