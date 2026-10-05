import { useTranslations } from 'use-intl';

import { useSelectedClient } from '@/entities/client';
import { useSettings } from '@/entities/settings';
import { ClientPicker } from '@/features/client/client-picker';
import { ClearCache } from '@/features/settings/clear-cache';
import { SettingsForm } from '@/features/settings/settings-form';
import { UninstallModpackCard } from '@/features/setup/uninstall-modpack';
import { useQueryLabels } from '@/shared/lib';
import { Card, PageHeader, QueryState } from '@/ui-kit';
import { SectionTabs } from '@/widgets/section-tabs';

export const SettingsView = () => {
  const t = useTranslations();
  const queryLabels = useQueryLabels();
  const settingsQuery = useSettings();
  const { clientPath } = useSelectedClient();

  return (
    <>
      <SectionTabs section='settings' />
      <PageHeader title={t('settings.title')} />
      <QueryState {...queryLabels} query={settingsQuery}>
        {(settings) => <SettingsForm settings={settings} />}
      </QueryState>
      <Card title={t('settings.clientTitle')}>
        <ClientPicker />
      </Card>
      <Card title={t('settings.cache.title')}>
        <ClearCache />
      </Card>
      <UninstallModpackCard clientPath={clientPath} />
    </>
  );
};
