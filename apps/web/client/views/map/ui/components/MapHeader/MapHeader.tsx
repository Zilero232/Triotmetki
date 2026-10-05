'use client';

import { secondsToMinutes } from 'date-fns';
import { useTranslations } from 'next-intl';

import { CAMOUFLAGE_TONE, isMapCamouflage, useMapLabels } from '@/entities/map/map';
import { ROUTES } from '@/shared/constants';
import { Badge, KeyFigure, KeyFigures, PageHeader } from '@/ui-kit';

import type { MapHeaderProps } from './MapHeader.types';

import { mapModes } from '../../../lib/map-modes';

export const MapHeader = ({ map }: MapHeaderProps) => {
  const t = useTranslations('maps');
  const labels = useMapLabels();

  const { name, sizeMeters, camouflage, maxPlayersInTeam, roundLengthSec, stats } = map;

  return (
    <PageHeader
      breadcrumbs={[{ label: t('head.title'), href: ROUTES.maps.list }, { label: name }]}
      description={labels.modes(mapModes(map).map(({ mode }) => mode)).join(' · ')}
      meta={camouflage && <Badge tone={isMapCamouflage(camouflage) ? CAMOUFLAGE_TONE[camouflage] : 'neutral'}>{labels.camouflage(camouflage)}</Badge>}
      title={name}
    >
      <KeyFigures>
        <KeyFigure label={t('map.sizeLabel')} suffix={` ${t('map.meters')}`} value={sizeMeters} />
        <KeyFigure label={t('map.playersLabel')} value={maxPlayersInTeam} />
        <KeyFigure
          label={t('map.roundLabel')}
          suffix={` ${t('map.minutes')}`}
          value={roundLengthSec === null ? null : secondsToMinutes(roundLengthSec)}
        />
        <KeyFigure label={t('map.stats.battles')} value={stats?.battles ?? null} />
      </KeyFigures>
    </PageHeader>
  );
};
