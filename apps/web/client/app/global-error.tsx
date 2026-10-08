'use client';

import { clsx } from 'clsx';
import { NextIntlClientProvider } from 'next-intl';

import type { Locale } from '@/shared/i18n';

import { LestaAttribution } from '@/entities/app/lesta-attribution';
import { usePathnameLocale } from '@/entities/app/locale';
import { FONT_VARIABLES } from '@/shared/config';
import { ROUTES } from '@/shared/constants';
import { localePath, TIME_ZONE } from '@/shared/i18n';
import enError from '@/shared/i18n/locales/en/error.json';
import enFooter from '@/shared/i18n/locales/en/footer.json';
import ruError from '@/shared/i18n/locales/ru/error.json';
import ruFooter from '@/shared/i18n/locales/ru/footer.json';
import { Button, buttonVariants, EmptyState } from '@/ui-kit';

import type { GlobalErrorProps } from './global-error.types';

import s from './global-error.module.scss';

import 'modern-normalize/modern-normalize.css';
import './globals.scss';

const ERROR_MESSAGES: Record<Locale, typeof ruError> = { ru: ruError, en: enError };

const FOOTER_MESSAGES: Record<Locale, typeof ruFooter> = { ru: ruFooter, en: enFooter };

const GlobalError = ({ reset }: GlobalErrorProps) => {
  const locale = usePathnameLocale();

  const t = ERROR_MESSAGES[locale];

  return (
    <html className={clsx(FONT_VARIABLES)} data-theme='dark' lang={locale}>
      <body>
        <main className={s.root}>
          <EmptyState
            action={
              <div className={s.actions}>
                <Button onClick={reset}>{t.retry}</Button>
                <a className={buttonVariants({ variant: 'secondary' })} href={localePath({ path: ROUTES.home, locale })}>
                  {t.home}
                </a>
              </div>
            }
            description={t.body}
            title={t.title}
          />
          <NextIntlClientProvider locale={locale} messages={{ footer: FOOTER_MESSAGES[locale] }} timeZone={TIME_ZONE}>
            <LestaAttribution className={s.attribution} />
          </NextIntlClientProvider>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
