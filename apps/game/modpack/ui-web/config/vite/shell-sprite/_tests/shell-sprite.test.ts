import { describe, expect, it } from 'vitest';

import { RETICLE_SHELLS } from '../../../../src/entities/hud/crosshair/config';
import { shellSpritePng } from '../shell-sprite';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const pngSize = (png: Uint8Array) => {
  const header = new DataView(png.buffer, png.byteOffset, png.byteLength);

  return { width: header.getUint32(16), height: header.getUint32(20) };
};

describe(shellSpritePng, () => {
  it('renders a PNG', () => {
    expect(Array.from(shellSpritePng().slice(0, 8))).toEqual(PNG_SIGNATURE);
  });

  it('holds every cell at the sprite scale', () => {
    const { sprite, viewBox } = RETICLE_SHELLS;

    expect(pngSize(shellSpritePng())).toEqual({
      width: sprite.kinds.length * viewBox.width * sprite.scale,
      height: sprite.paints.length * viewBox.height * sprite.scale
    });
  });
});
