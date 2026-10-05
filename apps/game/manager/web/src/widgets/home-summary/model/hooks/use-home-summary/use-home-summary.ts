import { match } from 'ts-pattern';

import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';
import { usePatchReport } from '@/entities/patch-report';
import { useNavigation } from '@/shared/lib';

export const useHomeSummary = () => {
  const { navigate } = useNavigation();
  const { client, clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);
  const { data: report } = usePatchReport();
  const components = installation?.components ?? [];
  const installedVersion = installation?.modpackVersion ?? null;
  const latestVersion = match(report?.status)
    .with({ kind: 'update_available' }, { kind: 'update_ready' }, (status) => status.latest)
    .otherwise(() => null);

  return {
    client: client ?? null,
    installedVersion,
    latestVersion,
    hasUpdate: latestVersion !== null && latestVersion !== installedVersion,
    enabledCount: components.filter((component) => component.state === 'enabled').length,
    totalCount: components.length,
    onOpenComponents: () => navigate({ page: 'components' }),
    onChangeSelection: () => navigate({ page: 'install' })
  };
};
