'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { RatingValue, TankAwards } from '@/entities/player/stats';
import { TankShowcaseCard, WinRateCell } from '@/entities/tank/tank';
import { ROUTES } from '@/shared/constants';

import type { PlayerTankCardProps } from './PlayerTankCard.types';

export const PlayerTankCard = ({ row: { vehicle, battles, winRate, wn8, markOfMastery, marksOnGun } }: PlayerTankCardProps) => {
  const t = useTranslations('profile.tanks.columns');
  const tCommon = useTranslations('common');
  const format = useFormatter();

  return (
    <TankShowcaseCard
      figures={[
        { id: 'battles', label: t('battles'), value: format.number(battles) },
        { id: 'winRate', label: t('winRate'), value: <WinRateCell value={winRate} /> },
        { id: 'wn8', label: tCommon('ratings.wn8'), value: <RatingValue rating={wn8} /> }
      ]}
      footer={<TankAwards markOfMastery={markOfMastery} marksOnGun={marksOnGun} />}
      href={ROUTES.tanks.detail(vehicle.slug)}
      layout='row'
      vehicle={vehicle}
    />
  );
};
