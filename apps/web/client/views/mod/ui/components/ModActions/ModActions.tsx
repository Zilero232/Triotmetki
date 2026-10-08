'use client';

import { Download, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTE_ANCHORS } from '@/shared/constants';
import { buttonVariants } from '@/ui-kit';

import { MOD_PAGE } from '../../../config';
import { useModDownloads } from '../../../model/hooks';
import { DownloadLink } from '../DownloadLink';

import s from './ModActions.module.scss';

export const ModActions = () => {
  const t = useTranslations('mod.hero');
  const { distribution, isPreparing, isManagerAvailable, manager, game } = useModDownloads();

  return (
    <div className={s.root}>
      <div className={s.buttons}>
        <DownloadLink
          hasShine
          fileName={distribution.managerFileName}
          href={distribution.managerUrl}
          icon={Download}
          isAvailable={isManagerAvailable}
          label={t('download')}
          variant='primary'
        />
        <a className={buttonVariants({ variant: 'secondary', size: 'lg' })} href={`#${ROUTE_ANCHORS.modFeatures}`}>
          <LayoutGrid aria-hidden size={MOD_PAGE.iconSize} />
          {t('inside')}
        </a>
      </div>
      <div className={s.status}>
        {isPreparing && (
          <p className={s.note} role='status'>
            {t('preparing')}
          </p>
        )}
        {manager && (
          <p className={s.meta}>
            <span className={s.part}>{t('file', manager)}</span>
            {game && <span className={s.part}>{t('game', { game })}</span>}
          </p>
        )}
      </div>
    </div>
  );
};
