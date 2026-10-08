'use client';

import { toRoman } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Breadcrumbs } from '@/ui-kit';

import { useTank } from '../../../../../model/context';

export const HeroCrumbs = () => {
  const t = useTranslations('tank.garage');
  const tGame = useTranslations('game');
  const { identity } = useTank();

  return (
    <Breadcrumbs
      isCurrentAccent
      items={[
        { label: t('crumbTanks'), href: ROUTES.tanks.catalog },
        { label: tGame(`nations.${identity.nation}`), href: ROUTES.tanks.filtered({ nations: identity.nation }) },
        { label: tGame(`classes.${identity.type}`), href: ROUTES.tanks.filtered({ types: identity.type }) },
        { label: t('crumbTier', { tier: toRoman(identity.tier) }), href: ROUTES.tanks.filtered({ tiers: identity.tier }) },
        { label: identity.name }
      ]}
    />
  );
};
