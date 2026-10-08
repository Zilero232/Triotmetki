import type { LinkedAccounts } from '@/shared/api/generated';

export const ownProfileNickname = (accounts: LinkedAccounts | undefined): string | null => {
  const lesta = accounts?.lesta ?? [];
  const primary = lesta.find(({ isPrimary }) => isPrimary) ?? lesta.at(0);

  return primary?.nickname ?? null;
};
