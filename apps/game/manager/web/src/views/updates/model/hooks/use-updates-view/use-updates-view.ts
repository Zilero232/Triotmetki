import { useLocale } from 'use-intl';

import { useCatalog } from '@/entities/catalog';
import { useWhatsNew } from '@/entities/changelog';
import { useSelectedClient } from '@/entities/client';
import { pickLocalized, useDisplayFormat } from '@/shared/lib';

import type { UpdateRelease } from './use-updates-view.types';

export const useUpdatesView = () => {
  const locale = useLocale();
  const { stamp } = useDisplayFormat();
  const { clientPath } = useSelectedClient();
  const whatsNewQuery = useWhatsNew(clientPath);
  const { data: catalog } = useCatalog();
  const titleOf = (id: string) => {
    const component = catalog?.components.find((item) => item.id === id);

    return component ? pickLocalized({ text: component.title, locale }) : id;
  };

  const releases: UpdateRelease[] = (whatsNewQuery.data?.releases ?? []).map((release) => ({
    version: release.version,
    date: stamp(new Date(release.publishedAt)),
    games: release.games.join(', '),
    notes: release.notes ? pickLocalized({ text: release.notes, locale }) : null,
    isInstalled: release.version === whatsNewQuery.data?.installedVersion,
    changes: release.changes.map((change) => ({
      id: change.id,
      title: titleOf(change.id),
      version: change.version,
      notes: change.notes ? pickLocalized({ text: change.notes, locale }) : null
    }))
  }));

  return {
    whatsNewQuery,
    isOffline: whatsNewQuery.data?.offline ?? false,
    isEmpty: releases.length === 0,
    releases
  };
};
