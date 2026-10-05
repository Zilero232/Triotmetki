import { useTranslations } from 'use-intl';

import { useSettings } from '@/entities/settings';
import { SettingsForm } from '@/features/settings/settings-form';
import { useQueryLabels } from '@/shared/lib';
import { PageHeader, QueryState } from '@/ui-kit';

export const SettingsView = () => {
  const t = useTranslations();
  const queryLabels = useQueryLabels();
  const settingsQuery = useSettings();

  return (
    <>
      <PageHeader description={t('settings.description')} title={t('settings.title')} />
      <QueryState {...queryLabels} query={settingsQuery}>
        {(settings) => <SettingsForm settings={settings} />}
      </QueryState>
    </>
  );
};
