'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

import type { ProfileTab } from '../../profile.types';

import { PROFILE_TABS, PROFILE_VIEW } from '../../../config';

export const useProfileTab = () => {
  const [tab, setTab] = useQueryState(
    PROFILE_VIEW.tabParam,
    parseAsStringLiteral(PROFILE_TABS).withDefault(PROFILE_TABS[0]).withOptions({ history: 'replace', scroll: false })
  );

  return { tab, setTab: (next: ProfileTab) => void setTab(next) };
};
