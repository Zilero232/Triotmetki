import { describe, expect, it } from 'vitest';

import { TOURNAMENT } from '../../../config/tournaments.constants';
import { storedBracket, storedCapacity } from '../stored-tournament';

describe('storedCapacity', () => {
  it('reads the capacity the organizer set', () => {
    expect(storedCapacity({ maxParticipants: TOURNAMENT.minParticipants })).toBe(TOURNAMENT.minParticipants);
  });

  it('falls back to the largest capacity when the rules are missing or malformed', () => {
    expect(storedCapacity(null)).toBe(TOURNAMENT.maxParticipants);
    expect(storedCapacity({ maxParticipants: 'many' })).toBe(TOURNAMENT.maxParticipants);
  });
});

describe('storedBracket', () => {
  it('returns null for a tournament that has no bracket yet', () => {
    expect(storedBracket(null)).toBeNull();
  });

  it('keeps a well-formed bracket', () => {
    const bracket = { size: 2, rounds: [[{ round: 0, index: 0, a: 1, b: 2, winner: null }]] };

    expect(storedBracket(bracket)).toEqual(bracket);
  });
});
