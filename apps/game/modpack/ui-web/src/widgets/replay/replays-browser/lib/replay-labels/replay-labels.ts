import type { ReplayItem, ReplaysPage } from '@/entities/replay/replay';

import { formatCount, formatDuration, formatMoment } from '@/entities/replay/replay';

import type { ReplaysStringKey } from '../../config';
import type { DetailStat, DetailStatsInput, JoinedInput, RowMetaInput, UploadHintInput } from './replay-labels.types';

import { REPLAYS_BROWSER } from '../../config';

const joined = ({ parts, separator }: JoinedInput): string => parts.filter(Boolean).join(separator);

export const replayName = (item: ReplayItem): string =>
  joined({ parts: [item.tank, item.map_title, formatMoment(item.time)], separator: REPLAYS_BROWSER.separators.name });

export const rowMeta = ({ item, typeLabel }: RowMetaInput): string =>
  joined({ parts: [item.map_title, typeLabel], separator: REPLAYS_BROWSER.separators.meta });

export const uploadHintKey = ({ item, upload }: UploadHintInput): ReplaysStringKey | null =>
  item.arena === null ? 'uploadNoArena' : REPLAYS_BROWSER.uploadHints[upload];

export const pageUpload = (page: ReplaysPage | null): UploadHintInput['upload'] => page?.upload ?? 'missing';

export const detailStats = ({ item, t }: DetailStatsInput): DetailStat[] => {
  const accuracy = [item.shots, item.hits, item.pens].map(formatCount).join(REPLAYS_BROWSER.separators.accuracy);

  return [
    { key: 'damage', label: t('damage'), value: formatCount(item.damage), accent: true },
    { key: 'assist', label: t('assist'), value: formatCount(item.assist) },
    { key: 'kills', label: t('kills'), value: formatCount(item.kills) },
    { key: 'spotted', label: t('spotted'), value: formatCount(item.spotted) },
    { key: 'xp', label: t('xp'), value: formatCount(item.xp) },
    { key: 'credits', label: t('credits'), value: formatCount(item.credits) },
    { key: 'shots', label: [t('shots'), t('hits'), t('pens')].join(REPLAYS_BROWSER.separators.accuracy), value: accuracy, wide: true },
    { key: 'received', label: t('received'), value: formatCount(item.received) },
    { key: 'blocked', label: t('blocked'), value: formatCount(item.blocked) },
    { key: 'duration', label: t('duration'), value: formatDuration(item.duration) },
    { key: 'lifeTime', label: t('lifeTime'), value: formatDuration(item.life_time) }
  ];
};
