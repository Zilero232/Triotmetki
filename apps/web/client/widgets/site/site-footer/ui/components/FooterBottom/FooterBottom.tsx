import { useTranslations } from 'next-intl';

import { LestaAttribution } from '@/entities/app/lesta-attribution';
import { env } from '@/shared/config';
import { SITE_LEGAL_LINKS } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';

import s from './FooterBottom.module.scss';

export const FooterBottom = () => {
  const t = useTranslations('footer');
  const tLegal = useTranslations('legal.footer');

  return (
    <div className={s.root}>
      <div className={s.row}>
        <nav aria-label={t('legalLabel')} className={s.docs}>
          {SITE_LEGAL_LINKS.map((item) => (
            <Link key={item.key} className={s.link} href={item.href}>
              {tLegal(item.key)}
            </Link>
          ))}
        </nav>
        <p className={s.meta}>
          <span className={s.version}>{t('version', { version: env.NEXT_PUBLIC_APP_VERSION })}</span>
        </p>
      </div>
      <LestaAttribution />
    </div>
  );
};
