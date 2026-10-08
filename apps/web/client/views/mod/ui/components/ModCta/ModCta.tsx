'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OpenInManager } from '@/features/mod/open-in-manager';

import { useModDownloads } from '../../../model/hooks';
import { DownloadLink } from '../DownloadLink';

import s from './ModCta.module.scss';

export const ModCta = () => {
  const t = useTranslations('mod');
  const { distribution, isManagerAvailable } = useModDownloads();

  return (
    <section aria-labelledby='mod-cta-title' className={s.root}>
      <div className={s.copy}>
        <h2 className={s.title} id='mod-cta-title'>
          {t('cta.title')}
        </h2>
        <p className={s.text}>{t('cta.text')}</p>
      </div>
      <div className={s.actions}>
        <DownloadLink
          hasShine
          fileName={distribution.managerFileName}
          href={distribution.managerUrl}
          icon={Download}
          isAvailable={isManagerAvailable}
          label={t('hero.download')}
          variant='primary'
        />
        <OpenInManager size='lg' target={{ kind: 'install', preset: 'recommended' }} variant='ghost' />
      </div>
    </section>
  );
};
