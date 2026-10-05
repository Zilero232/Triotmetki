import { useMutation, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'use-intl';

import { previewSrc } from '@/entities/catalog';
import { useSelectedClient } from '@/entities/client';
import { useGamefaceNotice } from '@/entities/gameface';
import { QUERY_KEYS } from '@/shared/config';
import { pickLocalized, useErrorText, useErrorToast, useNavigation } from '@/shared/lib';

import type { Selection } from '../../../lib';
import type { ClientScoped, ToggleInput, UseInstallWizardStateInput } from './use-install-wizard-state.types';

import { installModpack, readInstallerProfile } from '../../../api';
import { INSTALL_WIZARD } from '../../../config';
import {
  closeDependencies,
  dependencyRows,
  installBlocker,
  installedDependencies,
  matchingPreset,
  presetSelection,
  toggleSelection
} from '../../../lib';
import { useInstallPlan } from '../use-install-plan';

export const useInstallWizardState = ({ initialPreset, initialComponents, startAtReview }: UseInstallWizardStateInput) => {
  const t = useTranslations('install');
  const locale = useLocale();
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const errorText = useErrorText();
  const notifyGameface = useGamefaceNotice();
  const { clientPath } = useSelectedClient();
  const planQuery = useInstallPlan(clientPath);
  const [stepIndex, setStepIndex] = useState(startAtReview ? INSTALL_WIZARD.steps.length - 1 : 0);
  const [chosenFor, setChosenFor] = useState<ClientScoped | null>(null);
  const [removeOthersFor, setRemoveOthersFor] = useState<ClientScoped | null>(null);
  const [excludedFor, setExcludedFor] = useState<ClientScoped | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const chosen = chosenFor?.clientPath === clientPath ? chosenFor.selection : null;
  const removeOthers = removeOthersFor?.clientPath === clientPath ? removeOthersFor.selection : new Set<string>();
  const excluded = excludedFor?.clientPath === clientPath ? excludedFor.selection : new Set<string>();
  const setChosen = (selection: Selection) => setChosenFor({ clientPath, selection });
  const plan = planQuery.data ?? null;
  const catalog = plan?.catalog ?? null;
  const components = catalog?.components ?? [];
  const presets = catalog?.presets ?? [];
  const defaultPreset = presets.find((preset) => preset.id === initialPreset)?.id ?? presets[0]?.id ?? null;
  const isReinstall = plan?.installed === true && plan.currentComponents.length > 0;
  const initialSelection = initialComponents ? closeDependencies({ components, ids: initialComponents }) : null;
  const selection =
    chosen ??
    initialSelection ??
    (isReinstall ? closeDependencies({ components, ids: plan.currentComponents }) : presetSelection({ components, presetId: defaultPreset }));

  const presetId = matchingPreset({ components, presets, selection });
  const text = (value: Parameters<typeof pickLocalized>[0]['text']) => pickLocalized({ text: value, locale });
  const groups = (catalog?.categories ?? [])
    .map((category) => ({
      id: category.id,
      title: text(category.title),
      components: components
        .filter((component) => component.category === category.id)
        .map((component) => ({
          id: component.id,
          title: text(component.title),
          required: component.required,
          checked: selection.has(component.id)
        }))
    }))
    .filter((group) => group.components.length > 0);

  const rows = dependencyRows({ dependencies: catalog?.dependencies ?? [], statuses: plan?.dependencies ?? [], selection, excluded });
  const dependencies = rows.map(({ dependency, state, file, checked, locked }) => ({
    id: dependency.id,
    title: text(dependency.title),
    description: text(dependency.description),
    version: dependency.version,
    licence: dependency.licence.name,
    licenceUrl: dependency.licence.url,
    author: dependency.author.name,
    authorUrl: dependency.author.url,
    optional: dependency.optional,
    state,
    file,
    checked,
    locked
  }));

  const focused = components.find((component) => component.id === focusedId) ?? components[0] ?? null;
  const preview = focused && {
    category: focused.category,
    title: text(focused.title),
    description: text(focused.description),
    fairPlay: text(focused.fairPlay),
    video: focused.preview.video,
    src: previewSrc({ previewsDir: catalog?.previewsDir ?? null, file: focused.preview.image }),
    audioSrc: previewSrc({ previewsDir: catalog?.previewsDir ?? null, file: focused.preview.audio }),
    perf: focused.perf
  };

  const step = INSTALL_WIZARD.steps[stepIndex] ?? INSTALL_WIZARD.steps[0];
  const isClientSupported = plan !== null && plan.client.problem === null;
  const blocker = plan && installBlocker(plan);
  const canInstall = clientPath !== null && plan !== null && blocker === null;

  const install = useMutation({
    mutationFn: () =>
      installModpack({ clientPath, components: [...selection], removeOthers: [...removeOthers], excludedDependencies: [...excluded] }),
    onSuccess: async ({ installation, warnings }) => {
      queryClient.setQueryData(QUERY_KEYS.installation(clientPath), installation);
      await queryClient.invalidateQueries();

      toast.success(t('installed'), {
        description: t('installedHint', { count: installation.components.filter((component) => component.state === 'enabled').length })
      });

      for (const warning of warnings) {
        toast.warning(t(`partial.${warning.step}`), { description: errorText({ code: warning.code, message: '' }).hint });
      }

      navigate({ page: 'home' });
      await notifyGameface(clientPath);
    },
    onError: showError
  });

  const loadProfile = useMutation({
    mutationFn: async () => {
      const path = await open({ multiple: false, filters: [{ name: t('profileFilter'), extensions: [...INSTALL_WIZARD.profileExtensions] }] });

      return path ? readInstallerProfile(path) : null;
    },
    onSuccess: (ids) => {
      if (ids) {
        setChosen(closeDependencies({ components, ids }));
        toast.success(t('profileLoaded'));
      }
    },
    onError: showError
  });

  return {
    clientPath,
    planQuery,
    plan,
    step,
    stepIndex,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === INSTALL_WIZARD.steps.length - 1,
    presetId,
    presetOptions: presets.map((preset) => ({ value: preset.id, label: text(preset.title) })),
    groups,
    chosenGroups: groups
      .map((group) => ({ ...group, components: group.components.filter((component) => component.checked) }))
      .filter((group) => group.components.length > 0),
    preview,
    selectedCount: selection.size,
    totalCount: components.length,
    removeOthers,
    dependencies,
    dependencyCount: installedDependencies(rows).length,
    isReinstall,
    isClientSupported,
    isOffline: blocker === 'offline',
    parkedCount: plan?.parkedComponents.filter((id) => selection.has(id)).length ?? 0,
    canInstall,
    blocker,
    isInstalling: install.isPending,
    isLoadingProfile: loadProfile.isPending,
    goTo: setStepIndex,
    goNext: () => setStepIndex((index) => Math.min(index + 1, INSTALL_WIZARD.steps.length - 1)),
    goBack: () => setStepIndex((index) => Math.max(index - 1, 0)),
    onPresetChange: (id: string) => setChosen(presetSelection({ components, presetId: id })),
    onToggle: ({ id, checked }: ToggleInput) => setChosen(toggleSelection({ components, selection, id, checked })),
    onFocus: setFocusedId,
    onToggleOther: ({ id, checked }: ToggleInput) =>
      setRemoveOthersFor({
        clientPath,
        selection: checked ? new Set([...removeOthers, id]) : new Set([...removeOthers].filter((item) => item !== id))
      }),
    onToggleDependency: ({ id, checked }: ToggleInput) =>
      setExcludedFor({
        clientPath,
        selection: checked ? new Set([...excluded].filter((item) => item !== id)) : new Set([...excluded, id])
      }),
    onLoadProfile: () => loadProfile.mutate(),
    onInstall: () => install.mutate()
  };
};
