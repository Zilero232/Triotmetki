'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { PageHero } from '@/ui-kit';

import { useTanksFigures } from '../../../model/hooks';
import { TanksFigures } from '../TanksFigures';

export const TanksHero = () => {
  const t = useTranslations('tanks.head');
  const tSite = useTranslations('nav');
  const { heroTanks, hasFigures } = useTanksFigures();

  return (
    <PageHero
      art={heroTanks.length > 0 ? { kind: 'tanks', tanks: heroTanks } : undefined}
      breadcrumbs={[{ label: tSite('groups.vehicles'), href: ROUTES.tanks.list }, { label: tSite('tanksHub.stats') }]}
      figures={hasFigures && <TanksFigures />}
      lead={t('description')}
      title={t('title')}
    />
  );
};
