'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHeader } from '@/ui-kit';

import { useCompareIds } from '../model/hooks';
import { CompareBoard, CompareDock, ComparePresets } from './components';

import s from './CompareTanksPage.module.scss';

export const CompareTanksPage = () => {
  const t = useTranslations('tanks');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const { ids } = useCompareIds();

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[
          { label: tCommon('home'), href: ROUTES.home },
          { label: tNav('groups.vehicles'), href: ROUTES.tanks.list },
          { label: t('compare.head.title') }
        ]}
        description={t('compare.head.description')}
        title={t('compare.head.title')}
      >
        <CompareDock />
      </PageHeader>
      {ids.length > 0 ? <CompareBoard /> : <ComparePresets />}
      <p className={s.source}>{t('source')}</p>
    </div>
  );
};
