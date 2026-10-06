import { describe, expect, it } from 'vitest';

import type { UiField } from '@/shared/api/protocol';

import { fieldValue } from '../field-value';

const FIELDS: UiField[] = [
  { key: 'size', label: 'Size', hint: null, type: 'int', value: 3, default: 3, min: 1, max: 6 },
  { key: 'names', label: 'Names', hint: null, type: 'bool', value: true, default: false }
];

describe(fieldValue, () => {
  it('gives the value of a field as text', () => {
    expect(fieldValue({ fields: FIELDS, key: 'size' })).toBe('3');
  });

  it('writes a switch as text too', () => {
    expect(fieldValue({ fields: FIELDS, key: 'names' })).toBe('true');
  });

  it('gives nothing for a field the component does not have', () => {
    expect(fieldValue({ fields: FIELDS, key: 'missing' })).toBeNull();
  });
});
