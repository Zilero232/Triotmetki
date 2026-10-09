import { clsx } from 'clsx';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { preconnect } from 'react-dom';

import { env, FONT_VARIABLES } from '@/shared/config';
import { FORMATS, resolveLocale, routing, TIME_ZONE } from '@/shared/i18n';
import { defaultMetadata, defaultViewport } from '@/shared/seo';

import { rootMessages } from '../messages';
import { AppProviders } from '../providers/AppProviders';

import 'modern-normalize/modern-normalize.css';
import '../globals.scss';

export const metadata = defaultMetadata;

export const viewport = defaultViewport;

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

const LocaleLayout = async ({ children }: Pick<LayoutProps<'/[locale]'>, 'children'>) => {
  const locale = resolveLocale(await getLocale());

  preconnect(env.NEXT_PUBLIC_API_URL, { crossOrigin: 'anonymous' });

  return (
    <html suppressHydrationWarning className={clsx(FONT_VARIABLES)} data-theme='dark' lang={locale}>
      <body>
        <NextIntlClientProvider formats={FORMATS} locale={locale} messages={rootMessages(locale)} timeZone={TIME_ZONE}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
