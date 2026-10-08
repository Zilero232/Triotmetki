import { describe, expect, it, vi } from 'vitest';

import { api } from '@/shared/api/http';

import { getArmorModel, getArmorShowcase } from '../armor';

describe('getArmorModel', () => {
  it('sends cookies so the metered armor view counts the same anonymous device', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('stop'));

    await expect(getArmorModel({ idOrSlug: 'object-140' })).rejects.toThrow('stop');
    expect(get).toHaveBeenCalledWith('/tanks/object-140/armor', expect.objectContaining({ withCredentials: true }));
  });
});

describe('getArmorShowcase', () => {
  it('asks the unmetered showcase endpoint', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('stop'));

    await expect(getArmorShowcase({ idOrSlug: 'object-140' })).rejects.toThrow('stop');
    expect(get).toHaveBeenCalledWith('/tanks/object-140/armor/showcase', expect.any(Object));
  });
});
