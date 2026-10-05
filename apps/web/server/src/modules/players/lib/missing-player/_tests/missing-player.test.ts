import { describe, expect, it } from 'vitest';

import { PLAYER_LOOKUP } from '../../../config/player-lookup.constants';
import { missingPlayerKey } from '../missing-player';

describe('missingPlayerKey', () => {
  it('folds the case and surrounding spaces of a nickname into one key', () => {
    expect(missingPlayerKey({ kind: 'nickname', value: ' NoBody ' })).toBe(missingPlayerKey({ kind: 'nickname', value: 'nobody' }));
    expect(missingPlayerKey({ kind: 'nickname', value: 'nobody' })).toBe(`${PLAYER_LOOKUP.missingKeyPrefix}nickname:nobody`);
  });

  it('keeps ids and nicknames apart', () => {
    expect(missingPlayerKey({ kind: 'id', value: '42' })).not.toBe(missingPlayerKey({ kind: 'nickname', value: '42' }));
  });
});
