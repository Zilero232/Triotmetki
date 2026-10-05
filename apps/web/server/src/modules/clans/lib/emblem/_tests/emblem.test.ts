import { describe, expect, it } from 'vitest';

import { clanEmblem } from '../emblem';

describe('clanEmblem', () => {
  it.each([null, undefined, 'https://x.test/e.png', 42])('returns null for %s', (emblems) => {
    expect(clanEmblem(emblems)).toBeNull();
  });

  it('prefers the large game emblem over the portal ones', () => {
    expect(
      clanEmblem({ x64: { wot: 'https://cdn.test/wot64.png', portal: 'https://cdn.test/portal64.png' }, x24: { portal: 'https://cdn.test/p24.png' } })
    ).toBe('https://cdn.test/wot64.png');
  });

  it('falls back to a smaller emblem when the larger ones are missing', () => {
    expect(clanEmblem({ x24: { portal: 'https://cdn.test/p24.png' } })).toBe('https://cdn.test/p24.png');
  });

  it('skips an entry that is not a valid URL', () => {
    expect(clanEmblem({ x64: { wot: 'not a url' }, x32: { portal: 'https://cdn.test/p32.png' } })).toBe('https://cdn.test/p32.png');
  });

  it('returns null when no size has a usable URL', () => {
    expect(clanEmblem({ x64: 'flat-string', x195: { portal: '' } })).toBeNull();
  });
});
