import { describe, expect, it } from 'vitest';

import type { Provision } from '../../../../../generated';

import { PROVISION_KIND } from '../../config/provisions.constants';
import { toProvisionOption } from '../provision-option.mappers';

const effect = { attribute: 'reloadTime', op: 'mul', value: 0.9 };

const row: Provision = {
  provisionId: 5,
  name: 'Rammer',
  nameKey: null,
  descriptionKey: null,
  tag: 'rammer',
  type: 'optionalDevice',
  description: null,
  image: null,
  priceCredit: 500_000,
  priceGold: null,
  weight: null,
  tankIds: [],
  data: {
    kind: 'standard',
    groupName: 'firepower',
    categories: ['firepower', 7],
    modifiers: [effect, { attribute: 'x', op: 'pow', value: 1 }, { attribute: 'y', op: 'add' }, 'junk']
  },
  updatedAt: new Date()
};

describe('toProvisionOption', () => {
  it('keeps only well-formed modifiers and fills their optional fields', () => {
    expect(toProvisionOption(row).effects).toEqual([{ ...effect, specValue: null, condition: null }]);
  });

  it('keeps only string categories', () => {
    expect(toProvisionOption(row).categories).toEqual(['firepower']);
  });

  it('maps the provision type to its kind', () => {
    expect(toProvisionOption(row).kind).toBe(PROVISION_KIND[row.type]);
  });

  it('prefers the price stored in the data', () => {
    const price = { amount: 10, currency: 'bonds' };

    expect(toProvisionOption({ ...row, data: { price } }).price).toEqual(price);
  });

  it('falls back to the gold price, then the credit price', () => {
    expect(toProvisionOption({ ...row, priceGold: 0 }).price).toEqual({ amount: 0, currency: 'gold' });
    expect(toProvisionOption(row).price).toEqual({ amount: row.priceCredit, currency: 'credits' });
    expect(toProvisionOption({ ...row, priceCredit: null }).price).toBeNull();
  });

  it('falls back to the name for the tag and the archetype for the group', () => {
    const option = toProvisionOption({ ...row, tag: null, data: { archetype: 'mobility' } });

    expect(option.tag).toBe(row.name);
    expect(option.group).toBe('mobility');
  });

  it('treats data that is not an object as empty', () => {
    const option = toProvisionOption({ ...row, data: null });

    expect(option).toMatchObject({ variant: null, group: null, categories: [], effects: [] });
  });
});
