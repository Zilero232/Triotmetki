import type { VisibleAccountsInput } from './badge-visibility.types';

export const visibleAccounts = ({ devices, hidden }: VisibleAccountsInput): bigint[] => {
  const shown = new Set<bigint>();
  const refused = new Set<bigint>();

  for (const { accountId, badgeVisible } of devices) {
    if (accountId === null || badgeVisible === null) {
      continue;
    }

    if (badgeVisible) {
      shown.add(accountId);
    } else {
      refused.add(accountId);
    }
  }

  return [...shown].filter((accountId) => !refused.has(accountId) && !hidden.has(accountId));
};
