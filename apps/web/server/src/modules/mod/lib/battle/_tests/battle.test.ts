import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { BattleResultEvent } from '../../contract/contract.types';

import { ingestBatchSchema } from '../../contract/contract.schemas';
import { countsForSession, sessionIncrement, sessionUuid } from '../battle';
import { BATTLE } from '../battle.constants';

const example = ingestBatchSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../../../../../game/modpack/contract/examples/ingest.example.json', import.meta.url), 'utf8'))
);

const battle = example.events.find((event): event is BattleResultEvent => event.type === 'battle_result');

if (!battle) {
  throw new Error('the ingest example has no battle_result event');
}

describe('sessionUuid', () => {
  it('is stable for the same account and session and differs across accounts', () => {
    const first = sessionUuid({ accountId: 1n, sessionId: 's' });

    expect(sessionUuid({ accountId: 1n, sessionId: 's' })).toBe(first);
    expect(sessionUuid({ accountId: 2n, sessionId: 's' })).not.toBe(first);
  });

  it('has the shape of an RFC 4122 variant UUID', () => {
    expect(sessionUuid({ accountId: 1n, sessionId: 's' })).toMatch(/^[\da-f]{8}-[\da-f]{4}-8[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u);
  });
});

describe('sessionIncrement', () => {
  it('counts one battle with exactly one outcome', () => {
    for (const result of ['win', 'loss', 'draw'] as const) {
      const increment = sessionIncrement({ ...battle, result });

      expect(increment.battles).toBe(1);
      expect(increment.wins + increment.losses + increment.draws).toBe(1);
    }
  });
});

describe('countsForSession', () => {
  it('counts only random battles that carry a session id', () => {
    expect(countsForSession({ ...battle, bonus_type: BATTLE.randomBonusType, session_id: 's' })).toBe(true);
    expect(countsForSession({ ...battle, bonus_type: BATTLE.randomBonusType + 1, session_id: 's' })).toBe(false);
    expect(countsForSession({ ...battle, bonus_type: BATTLE.randomBonusType, session_id: null })).toBe(false);
  });
});
