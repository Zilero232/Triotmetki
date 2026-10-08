import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { playersControllerAchievements } from '@/shared/api/generated';

import { getPlayerAchievements } from '../achievements';

vi.mock('@/shared/api/generated', () => ({ playersControllerAchievements: vi.fn() }));

const httpError = (status: number) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() }
  });

describe('getPlayerAchievements', () => {
  it('treats a player without achievements as an empty list', async () => {
    vi.mocked(playersControllerAchievements).mockRejectedValue(httpError(404));

    const achievements = await getPlayerAchievements({ accountId: 42 });

    expect(achievements).toEqual({ items: [] });
  });

  it('surfaces any other failure', async () => {
    vi.mocked(playersControllerAchievements).mockRejectedValue(httpError(500));

    await expect(getPlayerAchievements({ accountId: 42 })).rejects.toBeDefined();
  });
});
