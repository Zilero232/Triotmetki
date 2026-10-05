import { describe, expect, it } from 'vitest';

import { accountState } from '../account';

const status = { bound: false, auth_failed: false, account_id: null, text: '' };

describe(accountState, () => {
  it('titles a bound account as bound', () => {
    const state = accountState({ ...status, bound: true });

    expect(state.title).toBe('accountBound');
  });

  it('titles an unbound account as unbound', () => {
    const state = accountState(status);

    expect(state.title).toBe('accountUnbound');
  });

  it('flags an expired binding as a danger', () => {
    const state = accountState({ ...status, bound: true, auth_failed: true });

    expect(state).toMatchObject({ title: 'accountAuthFailed', tone: 'danger' });
  });
});
