import { describe, expect, it } from 'vitest';

import { parseIcon } from '../client-icon';

describe(parseIcon, () => {
  it('splits a client image from its fallback glyph', () => {
    const icon = parseIcon('img://gui/maps/icons/vehicleTypes/red/at-spg.png|otmetki:class_td');

    expect(icon).toEqual({ image: 'img://gui/maps/icons/vehicleTypes/red/at-spg.png', glyph: 'class_td' });
  });

  it('reads a client image without a fallback glyph', () => {
    const icon = parseIcon('img://gui/maps/icons/artefact/rammer.png');

    expect(icon).toEqual({ image: 'img://gui/maps/icons/artefact/rammer.png', glyph: null });
  });

  it('reads a glyph alone', () => {
    expect(parseIcon('otmetki:fire')).toEqual({ image: null, glyph: 'fire' });
  });

  it.each([
    ['no icon', null],
    ['an image from outside the client', 'http://example.com/x.png']
  ])('reads nothing from %s', (_case, raw) => {
    expect(parseIcon(raw)).toEqual({ image: null, glyph: null });
  });
});
