'use client';

import { useLocale, useTranslations } from 'next-intl';

import { ratingValueTone } from '@/entities/player/stats';
import { TankIdentity, TankImage, vehicleIdentity } from '@/entities/tank/tank';
import { statValueText } from '@/shared/lib';

import type { SessionHighlightsProps } from './SessionHighlights.types';

import s from './SessionHighlights.module.scss';

export const SessionHighlights = ({ best, worst }: SessionHighlightsProps) => {
  const t = useTranslations('profile.sessions');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const items = [
    { key: 'best', entry: best },
    { key: 'worst', entry: worst }
  ] as const;

  return (
    <div className={s.root}>
      {items.map(
        ({ key, entry }) =>
          entry && (
            <div key={key} className={s.card} data-kind={key}>
              <TankImage isDecorative className={s.render} size='big' tank={vehicleIdentity(entry.vehicle)} />
              <div className={s.body}>
                <span className={s.label}>{t(key)}</span>
                <TankIdentity tank={vehicleIdentity(entry.vehicle)} withNation={false} />
                <div className={s.stats}>
                  <span className={s.rating} data-tone={ratingValueTone(entry.stats.wn8)}>
                    {tCommon('ratings.wn8')} {statValueText({ value: entry.stats.wn8.value, locale })}
                  </span>
                  <span className={s.muted}>{t('battlesCount', { count: entry.stats.battles })}</span>
                  <span className={s.muted}>{t('avgDamageShort', { value: statValueText({ value: entry.stats.avgDamage, locale }) })}</span>
                </div>
              </div>
            </div>
          )
      )}
    </div>
  );
};
