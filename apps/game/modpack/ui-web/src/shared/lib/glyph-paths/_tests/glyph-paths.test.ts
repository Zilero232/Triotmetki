import { describe, expect, it } from 'vitest';

import { glyphPaths } from '../glyph-paths';

const NEW_GLYPHS = ['fire', 'fall', 'ammo_rack', 'record', 'target', 'wn8', 'session', 'traverse', 'bush', 'mission'];

describe(glyphPaths, () => {
  it.each(NEW_GLYPHS)('draws the %s glyph of the redesign spec instead of the fallback shell', (name) => {
    const fallback = glyphPaths('nope').shapes;

    const { shapes } = glyphPaths(name);

    expect(shapes).not.toEqual(fallback);
  });

  it('falls back to the shell for an unknown name', () => {
    const shell = glyphPaths('damage').shapes;

    const { shapes } = glyphPaths('nope');

    expect(shapes).toEqual(shell);
  });

  it('adds the dark details of a glyph that has them', () => {
    expect(glyphPaths('mission').details).toHaveLength(3);
  });

  it('adds no details to a glyph without them', () => {
    expect(glyphPaths('fire').details).toEqual([]);
  });
});
