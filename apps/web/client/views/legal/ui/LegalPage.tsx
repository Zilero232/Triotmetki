import { useTranslations } from 'next-intl';

import { EXTERNAL_LINKS, SUPPORT } from '@/shared/config';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { PageHeader } from '@/ui-kit';

import type { LegalPageProps } from './LegalPage.types';

import { LEGAL_DOCS, LEGAL_SECTIONS } from '../config';

import s from './LegalPage.module.scss';

export const LegalPage = ({ doc }: LegalPageProps) => {
  const t = useTranslations('legal');

  return (
    <article className={s.root}>
      <PageHeader breadcrumbs={[{ label: t(`docs.${doc}.title`) }]} description={t(`docs.${doc}.lead`)} title={t(`docs.${doc}.title`)} />
      {LEGAL_SECTIONS[doc].map((section, index) => (
        <section key={section} className={s.section} id={section}>
          <h2 className={s.heading}>{`${index + 1}. ${t(`sections.${section}.title`)}`}</h2>
          <p className={s.body}>
            {t.rich(`sections.${section}.body`, {
              email: SUPPORT.email,
              mail: (chunks) => (
                <a className={s.link} href={`mailto:${SUPPORT.email}`}>
                  {chunks}
                </a>
              ),
              bot: (chunks) => (
                <a className={s.link} href={SUPPORT.telegramUrl} rel='noreferrer' target='_blank'>
                  {chunks}
                </a>
              ),
              lesta: (chunks) => (
                <a className={s.link} href={EXTERNAL_LINKS.lestaSupport} rel='noreferrer' target='_blank'>
                  {chunks}
                </a>
              )
            })}
          </p>
        </section>
      ))}
      <nav aria-label={t('related')} className={s.related}>
        {LEGAL_DOCS.filter((other) => other !== doc).map((other) => (
          <Link key={other} className={s.link} href={ROUTES.legal[other]}>
            {t(`docs.${other}.title`)}
          </Link>
        ))}
      </nav>
    </article>
  );
};
