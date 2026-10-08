import { describe, expect, it } from 'vitest';

import { ARMOR_MAP, ARMOR_PALETTE } from '../../../config';
import { decodeCell, hatchColor, isHatched, toneColor } from '../cell-code';

const codeChar = (code: number) => ARMOR_MAP.alphabet.charAt(code);

const TRACK_CODE = 7 + ARMOR_MAP.patternStep * ARMOR_MAP.pattern.track;

describe(decodeCell, () => {
  it('reads the tone of a cell without a hatch', () => {
    expect(decodeCell(codeChar(7))).toEqual({ tone: 7, pattern: ARMOR_MAP.pattern.none });
  });

  it('reads the hatch past each pattern step', () => {
    expect(decodeCell(codeChar(TRACK_CODE))).toEqual({ tone: 7, pattern: ARMOR_MAP.pattern.track });
  });

  it('reads an unknown character as an empty cell', () => {
    expect(decodeCell('!')).toEqual({ tone: ARMOR_MAP.empty, pattern: ARMOR_MAP.pattern.none });
  });
});

describe(toneColor, () => {
  it('paints a thickness tone from the thickness palette', () => {
    expect(toneColor({ tone: 1, mode: 'nominal' })).toBe(ARMOR_PALETTE.thickness[0]);
  });

  it('paints a shell tone from the shell palette', () => {
    expect(toneColor({ tone: 1, mode: 'shell' })).toBe(ARMOR_PALETTE.shell[0]);
  });

  it('paints a fixed tone the same in every mode', () => {
    expect(toneColor({ tone: 13, mode: 'shell' })).toBe(toneColor({ tone: 13, mode: 'nominal' }));
  });

  it('has no colour for an empty cell', () => {
    expect(toneColor({ tone: ARMOR_MAP.empty, mode: 'nominal' })).toBeNull();
  });
});

describe(hatchColor, () => {
  it('has no hatch without a pattern', () => {
    expect(hatchColor(ARMOR_MAP.pattern.none)).toBeNull();
  });

  it('hatches a screen and a track differently', () => {
    expect(hatchColor(ARMOR_MAP.pattern.screen)).not.toBe(hatchColor(ARMOR_MAP.pattern.track));
  });
});

describe(isHatched, () => {
  it('runs a screen hatch along one diagonal', () => {
    expect(isHatched({ col: 1, row: ARMOR_MAP.hatchPeriod - 1, pattern: ARMOR_MAP.pattern.screen })).toBe(true);
  });

  it('runs a track hatch along the other diagonal', () => {
    expect(isHatched({ col: 2, row: 2, pattern: ARMOR_MAP.pattern.track })).toBe(true);
  });

  it('leaves a cell without a pattern plain', () => {
    expect(isHatched({ col: 0, row: 0, pattern: ARMOR_MAP.pattern.none })).toBe(false);
  });
});
