import { useTransition } from 'react';

import { useRouter } from '@/shared/i18n/navigation';

import type { UseErrorRetryInput } from './use-error-retry.types';

export const useErrorRetry = ({ reset }: UseErrorRetryInput) => {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();

  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return { retry, isRetrying };
};
