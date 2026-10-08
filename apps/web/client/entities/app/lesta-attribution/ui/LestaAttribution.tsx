import { clsx } from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EXTERNAL_LINKS, SITE } from '@/shared/config';

import type { LestaAttributionProps } from './LestaAttribution.types';

import s from './LestaAttribution.module.scss';

export const LestaAttribution = ({ variant = 'inline', className }: LestaAttributionProps) => {
  const t = useTranslations('footer');

  if (variant === 'compact') {
    return (
      <p className={clsx(s.root, s.compact, className)} data-testid='lesta-attribution'>
        {t('shortAttribution')}
      </p>
    );
  }

  return (
    <p className={clsx(s.root, s[variant], className)} data-testid='lesta-attribution'>
      <span>{t('lestaCopyright')}</span>
      <span>
        {t('dataSource')}{' '}
        <a className={s.link} href={EXTERNAL_LINKS.game} rel='noreferrer' target='_blank'>
          {t('gameSite')}
        </a>
      </span>
      <span>{t('disclaimer')}</span>
      <span>
        <a className={s.link} href={EXTERNAL_LINKS.lestaSupport} rel='noreferrer' target='_blank'>
          {t('support')}
          <ArrowUpRight aria-hidden size={12} />
        </a>
      </span>
      <span>{t('copyright', { year: SITE.copyrightYear })}</span>
    </p>
  );
};
