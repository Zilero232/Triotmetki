import { describe, expect, it } from 'vitest';

import { findAdvisorModels, payloadOf, toItems } from '../advisor-model';

const advised = { otmetkiPresetAdvisor: { payload: 'text' } };

describe('findAdvisorModels', () => {
  it('finds the stock model carrying the payload at the root or in a sub view', () => {
    const subViews = { ids: () => [3, 4], get: (id: number) => (id === 4 ? { model: advised } : { model: {} }) };

    expect(findAdvisorModels({ model: advised, subViews })).toEqual([advised, advised]);
    expect(findAdvisorModels({ model: {} })).toEqual([]);
  });

  it('reads the payload text', () => {
    expect(payloadOf(advised)).toBe('text');
    expect(payloadOf({})).toBeUndefined();
  });
});

describe('toItems', () => {
  it('reads plain arrays and the Gameface array views whose items carry a value', () => {
    expect(toItems([1, 2])).toEqual([1, 2]);
    expect(toItems({ length: 2, 0: { value: 'a' }, 1: { value: 'b' } })).toEqual(['a', 'b']);
    expect(toItems(null)).toEqual([]);
  });
});
