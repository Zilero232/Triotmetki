'use client';

import { useTranslations } from 'next-intl';

import { winRateTone } from '@/entities/player/stats';
import { WinRateCell } from '@/entities/tank/tank';
import { KeyFigure, KeyFigures } from '@/ui-kit';

import type { StrongholdCardProps } from './StrongholdCard.types';

import { STRONGHOLD } from '../../../../../config';
import { BaseCard } from '../BaseCard';
import { BaseRow } from '../BaseRow';
import { BaseSection } from '../BaseSection';

export const StrongholdCard = ({ stronghold }: StrongholdCardProps) => {
  const t = useTranslations('clans.bases.stronghold');

  const { level, buildings, skirmishes, battles, winRate, totalResources } = stronghold;

  return (
    <BaseCard
      figures={
        <KeyFigures>
          <KeyFigure label={t('battles')} value={battles} />
          <KeyFigure format={{ maximumFractionDigits: 2 }} label={t('winRate')} suffix='%' tone={winRateTone(winRate)} value={winRate} />
          <KeyFigure label={t('resources')} value={totalResources} />
        </KeyFigures>
      }
      title={level === null ? t('levelUnknown') : t('levelOf', { level, max: STRONGHOLD.maxLevel })}
    >
      <BaseSection isEmpty={skirmishes.length === 0} note={t('noSkirmishes')} title={t('skirmishesTitle')}>
        {skirmishes.map((row) => (
          <BaseRow key={row.tier} label={t('tier', { tier: row.tier })}>
            {t('battlesCount', { count: row.battles })}
            <WinRateCell value={row.winRate} />
          </BaseRow>
        ))}
      </BaseSection>
      <BaseSection isEmpty={buildings.length === 0} note={t('noBuildings')} title={t('buildingsTitle')}>
        {buildings.map((building) => (
          <BaseRow key={`${building.type}-${building.position ?? ''}`} label={building.title ?? building.type}>
            {building.level === null ? '—' : t('buildingLevel', { level: building.level })}
          </BaseRow>
        ))}
      </BaseSection>
    </BaseCard>
  );
};
