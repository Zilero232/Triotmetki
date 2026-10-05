import { describe, expect, it } from 'vitest';

import { toAuthorView, toPlayerStats } from '../community-views.mappers';

describe('toAuthorView', () => {
  it('drops an avatar that is not an http URL', () => {
    expect(toAuthorView({ id: 'u', name: 'n', image: 'data:image/png;base64,AAA' }).image).toBeNull();
  });
});

describe('toPlayerStats', () => {
  it('returns null when the player has no rating yet', () => {
    expect(toPlayerStats(null)).toBeNull();
    expect(toPlayerStats({ battles: 10, winRate: 0.5, wn8: null })).toEqual({ battles: 10, winRate: 0.5, wn8: null });
  });
});
