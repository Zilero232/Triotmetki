'use client';

import { GlobalMapIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { PageHero, Tabs } from '@/ui-kit';
import { MapRotationPanel } from '@/widgets/map/map-rotation';

import { useMapsTab } from '../model/hooks';
import { MapsCatalog } from './components';

import s from './MapsPage.module.scss';

export const MapsPage = () => {
  const t = useTranslations('maps');
  const tabs = useTranslations('mapStats.tabs');
  const { tab, setTab } = useMapsTab();

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <GlobalMapIcon size={480} /> }}
        breadcrumbs={[{ label: t('head.title') }]}
        lead={t('head.description')}
        title={t('head.title')}
      />
      <div className={s.content}>
        <Tabs
          items={[
            { value: 'catalog', label: tabs('catalog'), content: <MapsCatalog /> },
            { value: 'rotation', label: tabs('rotation'), content: <MapRotationPanel /> }
          ]}
          aria-label={tabs('label')}
          value={tab}
          variant='panel'
          onValueChange={setTab}
        />
      </div>
    </div>
  );
};
