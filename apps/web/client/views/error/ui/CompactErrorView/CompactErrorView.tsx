'use client';

import { useTranslations } from 'next-intl';

import { LestaAttribution } from '@/entities/app/lesta-attribution';
import { Button } from '@/ui-kit';

import type { CompactErrorViewProps } from './CompactErrorView.types';

import { useErrorRetry } from '../../model/hooks';

import s from './CompactErrorView.module.scss';

export const CompactErrorView = ({ reset }: CompactErrorViewProps) => {
  const t = useTranslations('error');
  const { retry, isRetrying } = useErrorRetry({ reset });

  return (
    <section className={s.root} role='alert'>
      <p className={s.title}>{t('title')}</p>
      <Button disabled={isRetrying} size='sm' onClick={retry}>
        {t('retry')}
      </Button>
      <LestaAttribution variant='compact' />
    </section>
  );
};
