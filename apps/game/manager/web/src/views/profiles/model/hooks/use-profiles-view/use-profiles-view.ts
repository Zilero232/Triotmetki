import { useLocale } from 'use-intl';

import { useCatalog } from '@/entities/catalog';
import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';
import { useProfiles } from '@/entities/profile';
import { pickLocalized, useNavigation } from '@/shared/lib';

export const useProfilesView = () => {
  const locale = useLocale();
  const { params, navigate } = useNavigation();
  const { clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);
  const { data: profiles } = useProfiles(clientPath);
  const { data: catalog } = useCatalog();
  const enabled = installation?.components.filter((component) => component.state === 'enabled').map((component) => component.id) ?? [];

  return {
    clientPath,
    initialCode: params.profileCode ?? '',
    isDisabled: clientPath === null,
    components: enabled.length > 0 ? enabled : null,
    pendingSets: profiles?.pendingSets ?? 0,
    presets: (catalog?.presets ?? [])
      .filter((preset) => !preset.custom)
      .map((preset) => ({ id: preset.id, title: pickLocalized({ text: preset.title, locale }) })),
    onStartFromPreset: (preset: string) => navigate({ page: 'install', params: { preset } })
  };
};
