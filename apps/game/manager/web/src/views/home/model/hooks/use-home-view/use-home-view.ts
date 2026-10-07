import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';
import { statusView, usePatchReport } from '@/entities/patch-report';

import { HOME_VIEW } from '../../../config';

const PATCH_TONES = new Set<string>(HOME_VIEW.patchTones);

export const useHomeView = () => {
  const { query, clientPath } = useSelectedClient();
  const installationQuery = useInstallation(clientPath);
  const { data: report } = usePatchReport();
  const isLoading = query.isPending || (clientPath !== null && installationQuery.isPending);
  const view = report ? statusView({ status: report.status, needsMigration: installationQuery.data?.needsMigration ?? false }) : null;

  return {
    isLoading,
    isInstalled: installationQuery.data?.installed ?? false,
    isPatchShown: view !== null && (view.action !== null || PATCH_TONES.has(view.tone))
  };
};
