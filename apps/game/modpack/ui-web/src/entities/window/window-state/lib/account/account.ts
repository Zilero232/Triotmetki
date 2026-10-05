import type { UiStatus } from '@/shared/api/protocol';

import { ACCOUNT_STATES } from '../../config';

const accountKey = (status: UiStatus): keyof typeof ACCOUNT_STATES => {
  if (status.auth_failed) {
    return 'authFailed';
  }

  return status.bound ? 'bound' : 'unbound';
};

export const accountState = (status: UiStatus) => ACCOUNT_STATES[accountKey(status)];
