import { useTranslations } from 'use-intl';

import { Card, ExternalLink } from '@/ui-kit';

import { useUsedLibraries } from '../model/hooks';

import s from './UsedLibraries.module.scss';

export const UsedLibraries = () => {
  const t = useTranslations('about.libraries');
  const libraries = useUsedLibraries();

  if (libraries.length === 0) {
    return null;
  }

  return (
    <Card description={t('description')} title={t('title')}>
      <ul className={s.list}>
        {libraries.map((library) => (
          <li key={library.id} className={s.row}>
            <span className={s.name}>
              {library.title} <span className={s.version}>{library.version}</span>
            </span>
            <span className={s.meta}>
              <ExternalLink href={library.authorUrl}>{library.author}</ExternalLink>
              <ExternalLink href={library.licenceUrl}>{t('licence', { name: library.licence })}</ExternalLink>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
};
