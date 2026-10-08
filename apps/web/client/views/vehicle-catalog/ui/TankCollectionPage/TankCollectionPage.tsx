'use client';

import { HeavyTankIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Card, EmptyState, PageHero } from '@/ui-kit';

import type { TankCollectionPageProps } from './TankCollectionPage.types';

import { VEHICLE_CATALOG_VIEW } from '../../config';
import { useTankCollectionPage } from '../../model/hooks';
import { CatalogLayout, CatalogResults, CollectionLinks } from '../components';

import s from './TankCollectionPage.module.scss';

export const TankCollectionPage = ({ slug }: TankCollectionPageProps) => {
  const t = useTranslations('vehicleCatalog');
  const tNav = useTranslations('nav');
  const query = useTankCollectionPage(slug);

  return (
    <CatalogLayout
      hero={
        <PageHero
          breadcrumbs={[
            { label: tNav('groups.vehicles'), href: ROUTES.tanks.list },
            { label: tNav('tanksHub.catalog'), href: ROUTES.tanks.catalog },
            { label: t(`collections.items.${slug}.short`) }
          ]}
          art={{ kind: 'emblem', glyph: <HeavyTankIcon size={VEHICLE_CATALOG_VIEW.emblemSize} strokeWidth={VEHICLE_CATALOG_VIEW.emblemStroke} /> }}
          lead={t(`collections.items.${slug}.intro`)}
          title={t(`collections.items.${slug}.title`)}
        />
      }
    >
      <CollectionLinks current={slug} />
      <Card className={s.criteria} variant='panel'>
        <h2 className={s.label}>{t('collections.criteriaLabel')}</h2>
        <p className={s.text}>{t(`collections.items.${slug}.criteria`)}</p>
      </Card>
      <CatalogResults
        empty={<EmptyState description={t('collections.empty.description')} title={t('collections.empty.title')} />}
        query={query}
        summary={(shown) => <p className={s.label}>{t('collections.count', { count: shown })}</p>}
      />
    </CatalogLayout>
  );
};
