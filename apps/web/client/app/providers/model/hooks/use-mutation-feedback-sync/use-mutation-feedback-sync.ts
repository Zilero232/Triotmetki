'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import type { MutationTranslatorScope } from '@/shared/api/query-client';

import { setMutationTranslator } from '@/shared/api/query-client';

export const useMutationFeedbackSync = (scope: MutationTranslatorScope) => {
  const t = useTranslations();

  useEffect(() => {
    setMutationTranslator({ scope, translate: (key) => t(key) });

    return () => setMutationTranslator({ scope, translate: null });
  }, [scope, t]);
};
