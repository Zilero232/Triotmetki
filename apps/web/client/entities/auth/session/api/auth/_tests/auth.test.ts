import { afterEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '@/shared/api/auth';
import { bearerToken } from '@/shared/api/http';

import { signOut } from '../auth';

vi.mock('@/shared/api/auth', () => ({ authClient: { signOut: vi.fn(async () => ({ data: { success: true }, error: null })) } }));

afterEach(() => {
  bearerToken.clear();
});

describe('signOut', () => {
  it('forgets the bearer token after a successful sign-out', async () => {
    bearerToken.set('token-1');

    await signOut();

    expect(bearerToken.get()).toBeNull();
  });

  it('forgets the bearer token even when the server refuses the sign-out', async () => {
    vi.mocked(authClient.signOut).mockRejectedValueOnce(new Error('auth down'));
    bearerToken.set('token-1');

    await expect(signOut()).rejects.toThrow('auth down');

    expect(bearerToken.get()).toBeNull();
  });
});
