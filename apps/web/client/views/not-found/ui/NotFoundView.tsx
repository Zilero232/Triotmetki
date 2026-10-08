import { useTranslations } from 'next-intl';

import { LestaAttribution } from '@/entities/app/lesta-attribution';
import { CommandPaletteTrigger } from '@/features/search/command-palette';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants } from '@/ui-kit';

import type { NotFoundViewProps } from './NotFoundView.types';

import { NOT_FOUND, QUICK_LINKS } from '../config';

import s from './NotFoundView.module.scss';

export const NotFoundView = ({ withAttribution = false }: NotFoundViewProps) => {
  const t = useTranslations('notFound');
  const tNav = useTranslations('nav');

  return (
    <section aria-labelledby={NOT_FOUND.titleId} className={s.root}>
      <div className={s.card}>
        <p aria-hidden className={s.status}>
          {t('status')}
        </p>
        <p className={s.code}>{t('code')}</p>
        <h1 className={s.title} id={NOT_FOUND.titleId}>
          {t('title')}
        </h1>
        <p className={s.body}>{t('body')}</p>
        <div className={s.actions}>
          <CommandPaletteTrigger className={s.search} variant='hero' />
          <Link className={buttonVariants({ size: 'lg' })} href={ROUTES.home}>
            {t('home')}
          </Link>
        </div>
      </div>
      <nav aria-labelledby={NOT_FOUND.popularId} className={s.popular}>
        <h2 className={s.popularTitle} id={NOT_FOUND.popularId}>
          {t('popular')}
        </h2>
        <ul className={s.links}>
          {QUICK_LINKS.map((item) => (
            <li key={item.key}>
              <Link className={s.link} href={item.href}>
                <item.icon aria-hidden className={s.linkIcon} size={NOT_FOUND.iconSize} />
                <span className={s.linkText}>
                  <span className={s.linkLabel}>{tNav(`items.${item.key}`)}</span>
                  <span className={s.linkHint}>{tNav(`hints.${item.key}`)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {withAttribution && (
        <footer className={s.footer}>
          <LestaAttribution />
        </footer>
      )}
    </section>
  );
};
