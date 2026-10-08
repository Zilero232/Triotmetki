import { describe, expect, it } from 'vitest';

import { fillLabel, tierLabel } from '..';

describe(fillLabel, () => {
  it('puts the value in its placeholder', () => {
    expect(fillLabel({ template: '{m} м', values: { m: 250 } })).toBe('250 м');
  });

  it('leaves a placeholder without a value as it is', () => {
    expect(fillLabel({ template: '{m} м', values: {} })).toBe('{m} м');
  });
});

describe(tierLabel, () => {
  it('writes the tier in roman numerals, as the client does', () => {
    expect(tierLabel(8)).toBe('VIII');
  });

  it('writes nothing for an unknown tier', () => {
    expect(tierLabel(null)).toBe('');
  });
});
