import { describe, expect, it } from 'vitest';

import { spriteCellStyle } from '../sprite-cell';

describe(spriteCellStyle, () => {
  it('sizes the sheet by the grid and shifts it to the cell', () => {
    const style = spriteCellStyle({ file: 'icons.png', cell: { column: 2, row: 1 }, grid: { columns: 4, rows: 3 }, width: 10, height: 20 });

    expect(style).toEqual({
      width: '10rem',
      height: '20rem',
      backgroundImage: 'url(icons.png)',
      backgroundSize: '40rem 60rem',
      backgroundPosition: '-20rem -20rem'
    });
  });
});
