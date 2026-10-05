'use client';

import { useFormatter } from 'next-intl';

import type { ModpackAvailability } from '@/entities/mod/modpack-release';

import { useModpackAvailability, useModpackChangelog } from '@/entities/mod/modpack-release';
import { MOD_DISTRIBUTION } from '@/shared/config';

import type { ModDownload } from './use-mod-downloads.types';

import { MOD_PAGE } from '../../../config';
import { gameLabel } from '../../../lib/game-label';

export const useModDownloads = () => {
  const format = useFormatter();
  const availability = useModpackAvailability();
  const { data: changelog } = useModpackChangelog(MOD_PAGE.latestReleaseLimit);

  const games = changelog?.releases[0]?.games ?? [];

  const toDownload = (file: ModpackAvailability['manager']): ModDownload | null =>
    file && {
      version: file.version,
      size: format.number(file.size / MOD_PAGE.bytesPerMegabyte, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })
    };

  return {
    distribution: MOD_DISTRIBUTION,
    isPreparing: !availability.isPending && !availability.isPublished,
    manager: toDownload(availability.manager),
    game: games.length > 0 ? games.map(gameLabel).join(', ') : null
  };
};
