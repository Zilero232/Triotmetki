import { useEffect, useRef } from 'react';
import { useTranslations } from 'use-intl';

import type { PageId, SectionId } from '@/shared/lib';

import { useSelectedClient } from '@/entities/client';
import { useGameHealth } from '@/entities/game-health';
import { useInstallation } from '@/entities/installation';
import { usePatchReport } from '@/entities/patch-report';
import { PAGE_SECTIONS } from '@/shared/config';
import { useNavigation } from '@/shared/lib';

import { NAV_GROUPS, NAV_ICONS, NAV_KEYS } from '../../../config';
import { navMarker } from '../../../lib';
import { useNavKeys } from '../use-nav-keys';

const sections: readonly SectionId[] = NAV_GROUPS.flatMap((group) => group.sections);

export const useAppShell = () => {
  const t = useTranslations('nav');
  const { page, navigate } = useNavigation();
  const { clientPath } = useSelectedClient();
  const { data: report } = usePatchReport();
  const { data: installation } = useInstallation(clientPath);
  const { data: health } = useGameHealth(clientPath);
  const isInstalled = installation?.installed ?? false;
  const failureCount = isInstalled && health && !health.stale ? health.failures.length : 0;
  const mainRef = useRef<HTMLElement>(null);
  const onNavKeyDown = useNavKeys({ sections, onSelect: (section) => navigate({ page: section }) });

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [page]);

  return {
    mainRef,
    onNavKeyDown,
    groups: NAV_GROUPS.map((group) => ({
      id: group.id,
      label: t(`groups.${group.id}`),
      isLabelShown: group.isLabelShown,
      isPinned: group.isPinned,
      items: group.sections.map((id: SectionId) => {
        const pages: readonly PageId[] = PAGE_SECTIONS[id];
        const marker = navMarker({ section: id, statusKind: report?.status.kind ?? null, failureCount });
        const label = t(`sections.${id}`);
        const markerLabel = marker ? t(`marker.${marker.kind}`, { count: marker.count ?? 0 }) : null;
        const position = sections.indexOf(id) + 1;
        const shortcut = `${NAV_KEYS.shortcutModifier}+${position}`;

        return {
          id,
          label,
          ariaShortcut: `${NAV_KEYS.ariaShortcutModifier}+${position}`,
          hint: t('itemHint', { label: markerLabel ? `${label} · ${markerLabel}` : label, shortcut }),
          icon: NAV_ICONS[id],
          isActive: pages.includes(page),
          marker,
          markerLabel,
          onSelect: () => navigate({ page: id })
        };
      })
    }))
  };
};
