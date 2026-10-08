'use client';

import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';

import { pulseQueries } from '@/entities/pulse/pulse';

import { PULSE } from '../../../config';
import { heatGrid } from '../../../lib/heat-grid';
import { isMoscowZone } from '../../../lib/time-zone';

export const usePulseView = () => {
  const t = useTranslations('pulse');
  const format = useFormatter();
  const query = useQuery({ ...pulseQueries.current(), staleTime: PULSE.staleMs });

  const pulse = query.data;
  const peak = pulse?.bestHours[0] ?? null;
  const timezone = pulse?.timezone ?? PULSE.moscowZone;

  return {
    query,
    zone: isMoscowZone(timezone) ? t('zone.moscow') : t('zone.other', { timezone }),
    heat: heatGrid({ grid: pulse?.heatmap ?? [], levels: PULSE.levels }),
    peakHour: peak?.hour ?? null,
    peakShare: peak ? peak.share * 100 : null,
    series: {
      labels: pulse?.series.map((point) => format.dateTime(new Date(point.at), { weekday: 'short', hour: '2-digit', minute: '2-digit' })) ?? [],
      values: pulse?.series.map((point) => point.players) ?? []
    }
  };
};
