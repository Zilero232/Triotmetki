import { useStore } from '@nanostores/react';

import type { UiStatus } from '@/shared/api/protocol';

import { $query, $state, accountState, openSection, SECTION, setQuery, useT } from '@/entities/window/window-state';

const isBound = (status: UiStatus): boolean => status.bound && !status.auth_failed;

export const useHeader = () => {
  const t = useT();
  const query = useStore($query);
  const status = useStore($state)?.status ?? null;

  const accountOf = (current: UiStatus) => {
    const state = accountState(current);
    const bound = isBound(current);
    const label = bound && current.account_id !== null ? `${t('accountChipId')} ${current.account_id}` : t(state.title);

    return { ...state, bound, label };
  };

  return {
    query,
    searching: query.length > 0,
    setQuery,
    clearQuery: () => setQuery(''),
    account: status ? accountOf(status) : null,
    openAccount: () => openSection(SECTION.data)
  };
};
