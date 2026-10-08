'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { isLeavingClick } from '../leaving-click';

export const useUnsavedGuard = (isDirty: boolean) => {
  const t = useTranslations('common');

  const message = t('unsavedChanges');

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (!isLeavingClick(event)) {
        return;
      }

      // eslint-disable-next-line no-alert -- the prompt has to hold the click synchronously, like the browser's own beforeunload prompt
      const isLeaveConfirmed = window.confirm(message);

      if (isLeaveConfirmed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty, message]);
};
