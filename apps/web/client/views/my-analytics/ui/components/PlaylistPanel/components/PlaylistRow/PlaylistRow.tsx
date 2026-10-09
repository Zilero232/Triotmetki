'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { TankCell } from '@/entities/tank/tank';
import { Badge } from '@/ui-kit';

import type { PlaylistRowProps } from './PlaylistRow.types';

import { PLAYLIST_REASON_TONE } from '../../../../../config';

import s from './PlaylistRow.module.scss';

export const PlaylistRow = ({ item, index }: PlaylistRowProps) => {
  const t = useTranslations('analytics.playlist');
  const format = useFormatter();

  return (
    <li className={s.root}>
      <span className={s.index}>{index}</span>
      <TankCell className={s.tank} vehicle={item.vehicle} />
      <span className={s.reasons}>
        {item.reasons.map((reason) => (
          <Badge key={reason} tone={PLAYLIST_REASON_TONE[reason]}>
            {t(`reasons.${reason}`)}
          </Badge>
        ))}
      </span>
      <dl className={s.facts}>
        {item.moePercent !== null && (
          <div className={s.fact}>
            <dt>{t('moe')}</dt>
            <dd>{format.number(item.moePercent / 100, 'percent2')}</dd>
          </div>
        )}
        {item.damageToNextMark !== null && (
          <div className={s.fact}>
            <dt>{t('toNextMark')}</dt>
            <dd>{format.number(item.damageToNextMark, 'integer')}</dd>
          </div>
        )}
        {item.daysSinceBattle !== null && (
          <div className={s.fact}>
            <dt>{t('daysSince')}</dt>
            <dd>{format.number(item.daysSinceBattle, 'integer')}</dd>
          </div>
        )}
      </dl>
    </li>
  );
};
