import { match } from 'ts-pattern';
import { useTranslations } from 'use-intl';

import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';
import { usePatchReport } from '@/entities/patch-report';
import { useNavigation } from '@/shared/lib';

export const useHomeSummary = () => {
  const t = useTranslations('home.summary');
  const { navigate } = useNavigation();
  const { client, clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);
  const { data: report } = usePatchReport();
  const components = installation?.components ?? [];
  const installedVersion = installation?.modpackVersion ?? null;
  const latestVersion = match(report?.status)
    .with({ kind: 'update_available' }, { kind: 'update_ready' }, (status) => status.latest)
    .with({ kind: 'up_to_date' }, (status) => status.modpackVersion ?? installedVersion)
    .otherwise(() => null);

  const hasUpdate = latestVersion !== null && latestVersion !== installedVersion;

  return {
    client: client ?? null,
    installedVersion,
    versionBadge: match({ latestVersion, hasUpdate })
      .with({ latestVersion: null }, () => ({ tone: 'neutral' as const, label: t('latestUnknown') }))
      .with({ hasUpdate: true }, () => ({ tone: 'premium' as const, label: t('latest', { version: latestVersion ?? '' }) }))
      .otherwise(() => ({ tone: 'success' as const, label: t('upToDate', { version: latestVersion ?? '' }) })),
    enabledCount: components.filter((component) => component.state === 'enabled').length,
    totalCount: components.length,
    onOpenComponents: () => navigate({ page: 'components' }),
    onChangeSelection: () => navigate({ page: 'install' })
  };
};
