import { describe, expect, it } from 'vitest';

import { RETICLE_SHELLS } from '../../../config';
import { shellSpriteCell, shellSpriteStyle, shellSpriteSvg } from '../shell-sprite';

describe(shellSpriteCell, () => {
  it('puts each kind in its column and each paint in its row', () => {
    expect(shellSpriteCell({ kind: 'heat', paint: 'spent' })).toEqual({ column: 2, row: 2 });
  });

  it('draws a shell of no known kind as the plain shell', () => {
    expect(shellSpriteCell({ kind: null, paint: 'loaded' })).toEqual({ column: 0, row: 0 });
  });
});

describe(shellSpriteStyle, () => {
  it('scales the sprite to the slot and shows the one cell', () => {
    expect(shellSpriteStyle({ kind: 'apcr', paint: 'gold', width: 6, height: 15 })).toEqual({
      width: '6rem',
      height: '15rem',
      backgroundImage: 'url(shells.png)',
      backgroundSize: '24rem 60rem',
      backgroundPosition: '-6rem -15rem'
    });
  });
});

describe(shellSpriteSvg, () => {
  it('draws every kind once in every paint', () => {
    const groups = shellSpriteSvg().match(/<g /g);

    expect(groups).toHaveLength(RETICLE_SHELLS.sprite.kinds.length * RETICLE_SHELLS.sprite.paints.length);
  });

  it('is as large as its cells', () => {
    const { sprite, viewBox } = RETICLE_SHELLS;

    expect(shellSpriteSvg()).toContain(`width="${String(sprite.kinds.length * viewBox.width * sprite.scale)}"`);
  });
});
