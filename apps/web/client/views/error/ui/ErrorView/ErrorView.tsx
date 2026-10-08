'use client';

import { useTranslations } from 'next-intl';

import { LestaAttribution } from '@/entities/app/lesta-attribution';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Button, buttonVariants, EmptyState } from '@/ui-kit';

import type { ErrorViewProps } from './ErrorView.types';

import { useErrorRetry } from '../../model/hooks';

import s from './ErrorView.module.scss';

export const ErrorView = ({ reset, withAttribution = false }: ErrorViewProps) => {
  const t = useTranslations('error');
  const { retry, isRetrying } = useErrorRetry({ reset });

  return (
    <section className={s.root}>
      <EmptyState
        action={
          <div className={s.actions}>
            <Button disabled={isRetrying} onClick={retry}>
              {t('retry')}
            </Button>
            <Link className={buttonVariants({ variant: 'secondary' })} href={ROUTES.home}>
              {t('home')}
            </Link>
          </div>
        }
        description={t('body')}
        title={t('title')}
      />
      {withAttribution && (
        <footer className={s.footer}>
          <LestaAttribution />
        </footer>
      )}
    </section>
  );
};
