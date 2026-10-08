'use client';

import { useTranslations } from 'next-intl';

import { DataSourceNote, PageHeader, Tabs } from '@/ui-kit';

import { useShopTab } from '../model/hooks';
import { OfferList, ReturnsTable } from './components';

import s from './ShopPage.module.scss';

export const ShopPage = () => {
  const t = useTranslations('shop');
  const { tab, setTab } = useShopTab();

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('head.title') }]} description={t('head.description')} title={t('head.title')} />
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
