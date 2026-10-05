'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { setMutationTranslator } from '@/shared/api/query-client';

export const useMutationFeedbackSync = () => {
  const t = useTranslations();

  useEffect(() => {
    setMutationTranslator((key) => t(key));

    return () => setMutationTranslator(null);
  }, [t]);
};
