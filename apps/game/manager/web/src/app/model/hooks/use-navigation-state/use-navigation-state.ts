import { useCallback, useState } from 'react';

import type { NavigationTarget, NavigationValue } from '@/shared/lib';

import { PAGES } from '@/shared/config';

import type { NavigationState } from './use-navigation-state.types';

export const useNavigationState = (): NavigationValue => {
  const [state, setState] = useState<NavigationState>({ target: { page: PAGES.initial }, visit: 0 });
  const navigate = useCallback((target: NavigationTarget) => setState((current) => ({ target, visit: current.visit + 1 })), []);

  return {
    page: state.target.page,
    params: state.target.params ?? {},
    visit: state.visit,
    navigate
  };
};
