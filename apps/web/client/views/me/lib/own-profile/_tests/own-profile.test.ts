import { describe, expect, it } from 'vitest';

import type { LinkedAccounts } from '@/shared/api/generated';

import { ownProfileNickname } from '../own-profile';

const account = (nickname: string, isPrimary: boolean): LinkedAccounts['lesta'][number] => ({
  accountId: nickname.length,
  nickname,
  isPrimary,
  linkedAt: '2026-01-01T00:00:00.000Z',
  tokenExpiresAt: null,
  isStale: false
});

const accounts = (lesta: LinkedAccounts['lesta']): LinkedAccounts => ({ userId: 'user-1', name: 'Tanker', email: null, lesta, telegram: null });

describe('ownProfileNickname', () => {
  it('picks the primary Lesta account', () => {
    expect(ownProfileNickname(accounts([account('Second', false), account('Main', true)]))).toBe('Main');
  });

  it('falls back to the first linked account', () => {
    expect(ownProfileNickname(accounts([account('Only', false)]))).toBe('Only');
  });

  it('is null without a linked Lesta account', () => {
    expect(ownProfileNickname(accounts([]))).toBeNull();
  });

  it('is null before the accounts load', () => {
    expect(ownProfileNickname(undefined)).toBeNull();
  });
});
