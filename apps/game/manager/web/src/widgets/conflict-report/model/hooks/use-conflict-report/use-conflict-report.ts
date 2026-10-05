import { useLocale } from 'use-intl';

import { useCatalog } from '@/entities/catalog';
import { useSelectedClient } from '@/entities/client';
import { useConflicts } from '@/entities/conflict';
import { useInstallation } from '@/entities/installation';

import type { UseConflictReportInput } from './use-conflict-report.types';

import { conflictItems, restorableCount } from '../../../lib';

export const useConflictReport = ({ hideWhenClean }: UseConflictReportInput) => {
  const locale = useLocale();
  const { clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);
  const isInstalled = installation?.installed ?? false;
  const conflictsQuery = useConflicts({ clientPath, enabled: isInstalled });
  const { data: catalog } = useCatalog();
  const report = conflictsQuery.data ?? null;
  const items = report ? conflictItems({ report, catalog: catalog ?? null, locale }) : [];

  return {
    clientPath,
    conflictsQuery,
    items,
    isVisible: isInstalled && !(hideWhenClean && items.length === 0),
    restorable: report ? restorableCount(report) : 0,
    hasMissing: (report?.missing.length ?? 0) + (report?.replaced.length ?? 0) > 0,
    isChecking: conflictsQuery.isFetching,
    onRecheck: () => void conflictsQuery.refetch()
  };
};
