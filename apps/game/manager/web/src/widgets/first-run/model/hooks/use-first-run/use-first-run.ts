import { useState } from 'react';
import { useLocale } from 'use-intl';

import { useCatalog } from '@/entities/catalog';
import { useSelectedClient } from '@/entities/client';
import { installBlocker, presetSelection, useInstallPlan } from '@/features/setup/install-modpack';
import { pickLocalized, useErrorText, useNavigation } from '@/shared/lib';

export const useFirstRun = () => {
  const locale = useLocale();
  const errorText = useErrorText();
  const { navigate } = useNavigation();
  const { query: clientsQuery, client, clientPath } = useSelectedClient();
  const planQuery = useInstallPlan(clientPath);
  const { data: catalog } = useCatalog();
  const [chosenPreset, setChosenPreset] = useState<string | null>(null);

  const plan = planQuery.data ?? null;
  const components = plan?.catalog?.components ?? [];
  const catalogPresets = plan?.catalog?.presets ?? [];
  const presets = catalogPresets
    .filter((preset) => !preset.custom)
    .map((preset) => ({
      id: preset.id,
      title: pickLocalized({ text: preset.title, locale }),
      description: pickLocalized({ text: preset.description, locale }),
      count: presetSelection({ components, presets: catalogPresets, presetId: preset.id }).size
    }));

  const selected = presets.find((preset) => preset.id === chosenPreset) ?? presets[0] ?? null;
  const blocker = plan ? installBlocker(plan) : null;
  const canInstall = plan !== null && blocker === null && selected !== null;

  return {
    clientsQuery,
    planQuery,
    client: client ?? null,
    hasClient: client !== undefined,
    presets: presets.map((preset) => ({ ...preset, isSelected: preset.id === selected?.id })),
    selectedTitle: selected?.title ?? null,
    selectedCount: selected?.count ?? 0,
    releaseVersion: plan?.release?.version ?? plan?.catalog?.modpackVersion ?? catalog?.modpackVersion ?? null,
    blocker,
    canInstall,
    isGameDone: client !== undefined && client.problem === null,
    isPresetDone: canInstall,
    errorMessage: (error: unknown) => {
      const { title, hint } = errorText(error);

      return `${title}. ${hint}`;
    },
    onSelectPreset: setChosenPreset,
    onQuickInstall: () => navigate({ page: 'install', params: { preset: selected?.id ?? null, review: true } }),
    onCustomize: () => navigate({ page: 'install', params: { preset: selected?.id ?? null } })
  };
};
