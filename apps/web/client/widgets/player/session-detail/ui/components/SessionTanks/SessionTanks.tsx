'use client';

import { useLocale, useTranslations } from 'next-intl';

import { ratingValueTone } from '@/entities/player/stats';
import { TankCell, WinRateCell } from '@/entities/tank/tank';
import { statValueText } from '@/shared/lib';

import type { SessionTanksProps } from './SessionTanks.types';

import { SessionList } from '../SessionList';

import s from './SessionTanks.module.scss';

export const SessionTanks = ({ tanks }: SessionTanksProps) => {
  const t = useTranslations('profile.sessions');
  const locale = useLocale();

  return (
    <SessionList list='ul' title={t('tanks')}>
      {tanks.map(({ vehicle, stats }) => (
        <li key={vehicle.tankId} className={s.row}>
          <TankCell className={s.tank} vehicle={vehicle} />
          <span className={s.cell}>{t('battlesCount', { count: stats.battles })}</span>
          <WinRateCell className={s.value} value={stats.winRate} />
          <span className={s.cell}>{statValueText({ value: stats.avgDamage, locale })}</span>
          <span className={s.rating} data-tone={ratingValueTone(stats.wn8)}>
            {statValueText({ value: stats.wn8.value, locale })}
          </span>
        </li>
      ))}
    </SessionList>
  );
};
