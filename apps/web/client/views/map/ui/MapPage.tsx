'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { useRouteParam } from '@/shared/lib';
import { DataSourceNote, PageHeader, Tabs } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import { useMapDetail } from '../model/hooks';
import { MapHeader, MapNav, MapSkeleton, MapStats, MapTanks } from './components';

import s from './MapPage.module.scss';

export const MapPage = () => {
  const t = useTranslations('maps.missing');
  const tNav = useTranslations('nav.items');
  const tTabs = useTranslations('maps.map.tabs');
  const mapId = useRouteParam('id');
  const query = useMapDetail(mapId);

  return (
    <div className={s.root}>
      <ResourceGate
        back={{ href: ROUTES.maps.list, label: t('toMaps') }}
        error={{ title: t('errorTitle'), description: t('errorDescription', { id: mapId }) }}
        header={<PageHeader breadcrumbs={[{ label: tNav('maps'), href: ROUTES.maps.list }, { label: mapId }]} title={mapId} />}
        notFound={{ title: t('notFoundTitle'), description: t('notFoundDescription', { id: mapId }) }}
        query={query}
        skeleton={<MapSkeleton />}
      >
        {(map) => (
          <>
            <MapHeader map={map} />
            <Tabs
              items={[
                { value: 'overview', label: tTabs('overview'), content: <MapStats stats={map.stats} /> },
                { value: 'tanks', label: tTabs('tanks'), content: <MapTanks arenaId={map.arenaId} /> }
              ]}
              aria-label={tTabs('label')}
              variant='panel'
            />
            <MapNav arenaId={map.arenaId} />
            <DataSourceNote />
          </>
        )}
      </ResourceGate>
    </div>
  );
};
