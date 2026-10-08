'use client';

import { Sigma } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/ui-kit';

import { RATINGS_PAGE } from '../config';
import { useRatingsMethod } from '../model/hooks';
import { MethodSection, ScaleLegend, SourcesNote } from './components';

import s from './RatingsPage.module.scss';

export const RatingsPage = () => {
  const t = useTranslations('methodology.head');
  const { sections, scale } = useRatingsMethod();

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('title') }]} description={t('lead')} emblem={<Sigma />} title={t('title')} />
      <div className={s.body}>
        <nav aria-label={t('toc')} className={s.toc}>
          <p aria-hidden className={s.tocTitle}>
            {t('toc')}
          </p>
          <ol className={s.tocList}>
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a className={s.tocLink} href={`#${id}`}>
                  {title}
                </a>
              </li>
            ))}
            <li>
              <a className={s.tocLink} href={`#${RATINGS_PAGE.scaleAnchor}`}>
                {t('scale')}
              </a>
            </li>
          </ol>
        </nav>
        <div className={s.content}>
          {sections.map((section) => (
            <MethodSection key={section.id} section={section} />
          ))}
          <ScaleLegend rows={scale} />
          <SourcesNote />
        </div>
      </div>
    </div>
  );
};
