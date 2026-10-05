import { describe, expect, it } from 'vitest';

import type { StoredShot } from '../../../../analytics';

import { HONEST_RNG_AGGREGATE } from '../../../config/aggregate.constants';
import { emptyTally, foldBattle, tallySummary } from '../../roll-tally/roll-tally';
import { battleScopes, dailyFromTally, tallyFromDaily } from '../rng-daily';

const shot = (shell: StoredShot['shell']): StoredShot => ({ damage: 400, nominal: 400, shell, outcome: 'damage', distance: 100, fatal: false });

describe('battleScopes', () => {
  it('counts a battle for the server, its tier and each shell it fired, accuracy only outside shells', () => {
    const scopes = battleScopes({ tier: 8, shots: [shot('armor_piercing'), shot('high_explosive')], accuracy: { fired: 2, hit: 2, pierced: 1 } });

    expect(scopes.map((entry) => entry.scope)).toEqual([
      HONEST_RNG_AGGREGATE.scopes.server,
      `${HONEST_RNG_AGGREGATE.scopes.tier}:8`,
      `${HONEST_RNG_AGGREGATE.scopes.shell}:armor_piercing`,
      `${HONEST_RNG_AGGREGATE.scopes.shell}:high_explosive`
    ]);

    expect(scopes.filter((entry) => entry.accuracy === null).every((entry) => entry.scope.startsWith(HONEST_RNG_AGGREGATE.scopes.shell))).toBe(true);
  });

  it('skips the tier scope for an unknown vehicle', () => {
    expect(battleScopes({ tier: undefined, shots: [], accuracy: { fired: 0, hit: 0, pierced: 0 } }).map((entry) => entry.scope)).toEqual([
      HONEST_RNG_AGGREGATE.scopes.server
    ]);
  });
});

describe('dailyFromTally', () => {
  it('round-trips a tally through its stored daily row', () => {
    const tally = foldBattle({ tally: emptyTally(), accountId: '42', shots: [shot('armor_piercing')], accuracy: { fired: 1, hit: 1, pierced: 1 } });
    const row = dailyFromTally({ day: new Date('2026-09-24T00:00:00Z'), scope: 'server', tally });

    expect(tallySummary(tallyFromDaily(row))).toEqual(tallySummary(tally));
  });
});
