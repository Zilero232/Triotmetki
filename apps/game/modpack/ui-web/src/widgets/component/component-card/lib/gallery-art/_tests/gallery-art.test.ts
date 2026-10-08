import { describe, expect, it } from 'vitest';

import { artStyle } from '../gallery-art';

describe(artStyle, () => {
  it('paints a client image as the tile background', () => {
    expect(artStyle('img://comp7/gui/maps/icons/comp7/backgrounds/prime_time_back.jpg')).toEqual({
      backgroundImage: 'url("img://comp7/gui/maps/icons/comp7/backgrounds/prime_time_back.jpg")'
    });
  });

  it('paints a captured frame as the tile background', () => {
    expect(artStyle('data:image/png;base64,AAAA')).toEqual({ backgroundImage: 'url("data:image/png;base64,AAAA")' });
  });
});
