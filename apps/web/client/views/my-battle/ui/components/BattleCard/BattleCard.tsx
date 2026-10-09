'use client';

import { Share2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { TankImage } from '@/entities/tank/tank';
import { Button, Card, ClassIcon, DeltaValue, TierNumeral } from '@/ui-kit';

import type { BattleCardProps } from './BattleCard.types';

import { useBattleCard } from '../../../model/hooks';

import s from './BattleCard.module.scss';

export const BattleCard = ({ battle }: BattleCardProps) => {
  const t = useTranslations('analytics.battle');
  const format = useFormatter();
  const { facts, duration, lifetime, map, startedAt, onShare } = useBattleCard(battle);

  return (
    <Card className={s.root} data-result={battle.result} padding='none'>
      <header className={s.head}>
        <div className={s.tank}>
          {battle.vehicle && <TankImage isDecorative isPriority size='big' tank={battle.vehicle} />}
          <div className={s.identity}>
            {battle.vehicle && (
              <span className={s.meta}>
                <ClassIcon size={16} tankClass={battle.vehicle.type} variant={battle.vehicle.isPremium ? 'premium' : 'regular'} />
                <TierNumeral tier={battle.vehicle.tier} />
              </span>
            )}
            <h2 className={s.name}>{battle.vehicle?.name ?? battle.tankId}</h2>
            <span className={s.map}>
              {map} · {startedAt}
            </span>
          </div>
        </div>
        <div className={s.outcome}>
          <span className={s.result}>{t(`results.${battle.result}`)}</span>
          <span className={s.fate}>{t(battle.survived ? 'survived' : 'destroyed')}</span>
        </div>
      </header>
      <dl className={s.facts}>
        {facts.map(({ key, value }) => (
          <div key={key} className={s.fact}>
            <dt>{t(`facts.${key}`)}</dt>
            <dd>{value === null ? '—' : format.number(value, 'integer')}</dd>
          </div>
        ))}
        <div className={s.fact}>
          <dt>{t('facts.moe')}</dt>
          <dd>
            {battle.moePercent === null ? '—' : format.number(battle.moePercent / 100, 'percent2')}
            {battle.moePercentDelta !== null && <DeltaValue className={s.delta} suffix='%' value={battle.moePercentDelta} />}
          </dd>
        </div>
        <div className={s.fact}>
          <dt>{t('facts.duration')}</dt>
          <dd>{duration ?? '—'}</dd>
        </div>
        <div className={s.fact}>
          <dt>{t('facts.lifetime')}</dt>
          <dd>{lifetime ?? '—'}</dd>
        </div>
      </dl>
      <footer className={s.foot}>
        <span className={s.brand}>{t('brand')}</span>
        <Button size='sm' variant='secondary' onClick={onShare}>
          <Share2 size={14} />
          {t('share.action')}
        </Button>
      </footer>
    </Card>
  );
};
