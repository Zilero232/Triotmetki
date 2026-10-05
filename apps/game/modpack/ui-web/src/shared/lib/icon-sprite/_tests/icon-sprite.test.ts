import { describe, expect, it } from 'vitest';

import { UI_ICONS } from '@/shared/config';

import { spriteCell, spriteRowsPerTone, spriteSize, spriteStyle } from '../icon-sprite';

const SECOND_ROW_SECOND_NAME = UI_ICONS.names[UI_ICONS.columns + 1] ?? 'logo';

const EVERY_CELL = UI_ICONS.tones.flatMap((tone) => UI_ICONS.names.map((name) => spriteCell({ name, tone })));

describe(spriteCell, () => {
  it('puts the first name of the first tone in the top left cell', () => {
    expect(spriteCell({ name: 'logo', tone: 'muted' })).toEqual({ column: 0, row: 0 });
  });

  it('lays the names out row by row', () => {
    expect(spriteCell({ name: SECOND_ROW_SECOND_NAME, tone: 'muted' })).toEqual({ column: 1, row: 1 });
  });

  it('gives every tone its own block of rows', () => {
    expect(spriteCell({ name: 'logo', tone: 'accent' })).toEqual({ column: 0, row: 2 * spriteRowsPerTone() });
  });

  it('gives every name and tone its own cell', () => {
    const distinct = new Set(EVERY_CELL.map(({ column, row }) => `${column}:${row}`));

    expect(distinct.size).toBe(EVERY_CELL.length);
  });

  it('keeps every cell inside the sprite', () => {
    const { columns, rows } = spriteSize();

    const outside = EVERY_CELL.filter(({ column, row }) => column >= columns || row >= rows);

    expect(outside).toEqual([]);
  });
});

describe(spriteStyle, () => {
  it('scales the sprite to the icon size in rem and points at the cell', () => {
    const { columns, rows } = spriteSize();

    const style = spriteStyle({ name: 'logo', tone: 'text', size: 20 });

    expect(style).toEqual({
      width: '20rem',
      height: '20rem',
      backgroundImage: `url(${UI_ICONS.file})`,
      backgroundSize: `${columns * 20}rem ${rows * 20}rem`,
      backgroundPosition: `0rem ${-spriteRowsPerTone() * 20}rem`
    });
  });
});
