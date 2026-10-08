import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/shared/constants';

describe('ROUTES.replays.filtered', () => {
  it('opens the replay list filtered by a player', () => {
    expect(ROUTES.replays.filtered({ player: 'Jove' })).toBe('/replays?player=Jove');
  });

  it('opens the replay list filtered by a tank id', () => {
    expect(ROUTES.replays.filtered({ tank: 7169 })).toBe('/replays?tank=7169');
  });

  it('leaves out the filters that are not set', () => {
    expect(ROUTES.replays.filtered({ map: '05_prohorovka', clan: undefined })).toBe('/replays?map=05_prohorovka');
  });

  it('encodes a clan tag', () => {
    expect(ROUTES.replays.filtered({ clan: 'A&B' })).toBe('/replays?clan=A%26B');
  });
});
