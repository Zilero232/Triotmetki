import { useTranslations } from 'use-intl';

import { skippedLooks, useHangarLooksStatus } from '@/entities/hangar-looks';

import type { HangarLooksNote } from './use-hangar-looks-note.types';

export const useHangarLooksNote = (clientPath: string | null): HangarLooksNote | null => {
  const t = useTranslations('components');
  const { data: status } = useHangarLooksStatus(clientPath);

  if (!status || status.state === 'none') {
    return null;
  }

  if (status.state === 'failed') {
    return { isFailed: true, built: t('hangarLooks.failed'), skipped: null };
  }

  const list = skippedLooks(status)
    .map((look) => t('hangarLooks.skippedItem', { title: look.title, reason: t(`hangarLooks.reason.${look.reason}`) }))
    .join(', ');

  return {
    isFailed: false,
    built: status.state === 'generated' ? t('hangarLooks.built', { version: status.clientVersion ?? '' }) : null,
    skipped: list === '' ? null : t('hangarLooks.skipped', { list })
  };
};
