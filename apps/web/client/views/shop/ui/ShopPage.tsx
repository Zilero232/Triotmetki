'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { DataSourceNote, PageHeader, Tabs } from '@/ui-kit';

import { useShopTab } from '../model/hooks';
import { OfferList, ReturnsTable } from './components';

import s from './ShopPage.module.scss';

export const ShopPage = () => {
  const t = useTranslations('shop');
  const tCommon = useTranslations('common');
  const { tab, setTab } = useShopTab();

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[{ label: tCommon('home'), href: ROUTES.home }, { label: t('head.title') }]}
        description={t('head.description')}
        title={t('head.title')}
      />
      <Tabs
        items={[
          { value: 'current', label: t('tabs.current'), content: <OfferList isActiveOnly /> },
          { value: 'history', label: t('tabs.history'), content: <OfferList isActiveOnly={false} /> },
          { value: 'returns', label: t('tabs.returns'), content: <ReturnsTable /> }
        ]}
        value={tab}
        variant='panel'
        onValueChange={setTab}
      />
      <DataSourceNote />
    </div>
  );
};
