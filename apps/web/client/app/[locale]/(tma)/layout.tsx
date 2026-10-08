import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { withMessages } from '@/app/messages';
import { resolveLocale } from '@/shared/i18n';
import { MiniAppFooter } from '@/views/mini-app';

import s from './layout.module.scss';

const MiniAppLayout = async ({ children }: LayoutProps<'/[locale]'>) => {
  const locale = resolveLocale(await rootParams.locale());
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <div className={s.root} data-theme='dark'>
      <a className={s.skip} href='#main'>
        {t('skipToContent')}
      </a>
      <div className={s.column}>
        <main className={s.main} id='main' tabIndex={-1}>
          {children}
        </main>
        <MiniAppFooter />
      </div>
    </div>
  );
};

export default withMessages({ component: MiniAppLayout, messages: ['tg'] });
