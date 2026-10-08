import { describe, expect, it } from 'vitest';

import { pickerListHeight, tableBodyHeight } from '..';

describe('tableBodyHeight', () => {
  it('sizes the table body to its rows in rem, the unit the client scales', () => {
    expect(tableBodyHeight(3)).toBe('102rem');
  });
});

describe('pickerListHeight', () => {
  it('shows at most six battles before the list scrolls', () => {
    expect(pickerListHeight(9)).toBe('408rem');
  });
});
