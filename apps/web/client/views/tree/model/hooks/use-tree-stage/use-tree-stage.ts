'use client';

import { useMediaQuery } from '@siberiacancode/reactuse';

import { useHydrated } from '@/shared/lib';

import { TREE_VIEW } from '../../../config';

export const useTreeStage = () => {
  const isHydrated = useHydrated();
  const isList = useMediaQuery(TREE_VIEW.listQuery);

  return { isHydrated, isList };
};
