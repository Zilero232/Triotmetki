'use client';

import { HeavyTankIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { CatalogPending } from '@/entities/tank/tank';
import { ROUTES } from '@/shared/constants';
import { Card, FilteredEmptyState, PageHero } from '@/ui-kit';
import { TanksHubNav } from '@/widgets/tank/tanks-hub-nav';

import { VEHICLE_CATALOG_VIEW } from '../../config';
import { useVehicleCatalogPage } from '../../model/hooks';
import { CatalogFilters, CatalogLayout, CatalogResults, CollectionLinks } from '../components';

export const VehicleCatalogPage = () => {
  const t = useTranslations('vehicleCatalog');
  const tNav = useTranslations('nav');
  const { query, isFiltered, onReset } = useVehicleCatalogPage();

  return (
    <CatalogLayout
      hero={
        <PageHero
          breadcrumbs={[
            { label: t('head.home'), href: ROUTES.home },
            { label: tNav('groups.vehicles'), href: ROUTES.tanks.list },
            { label: tNav('tanksHub.catalog') }
          ]}
          art={{ kind: 'emblem', glyph: <HeavyTankIcon size={VEHICLE_CATALOG_VIEW.emblemSize} strokeWidth={VEHICLE_CATALOG_VIEW.emblemStroke} /> }}
          lead={t('head.description')}
          title={t('head.title')}
        />
      }
    >
      <TanksHubNav current='catalog' />
      <CollectionLinks />
      <CatalogFilters />
      <CatalogResults
        empty={
          <Card>
            {isFiltered ? (
              <FilteredEmptyState isFiltered description={t('empty.description')} title={t('empty.title')} onReset={onReset} />
            ) : (
              <CatalogPending />
            )}
          </Card>
        }
        query={query}
      />
    </CatalogLayout>
  );
};
