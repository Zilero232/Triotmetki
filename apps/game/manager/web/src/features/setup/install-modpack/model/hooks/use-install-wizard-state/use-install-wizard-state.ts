import { useState } from 'react';
import { clamp } from 'remeda';
import { useLocale } from 'use-intl';

import { useSelectedClient } from '@/entities/client';
import { PAGES } from '@/shared/config';
import { toggledSet, useNavigation } from '@/shared/lib';

import type { Selection } from '../../../lib';
import type { ClientScoped, ToggleInput, UseInstallWizardStateInput } from './use-install-wizard-state.types';

import { INSTALL_WIZARD, LAST_WIZARD_STEP } from '../../../config';
import {
  chosenGroups,
  defaultPreset,
  installBlocker,
  isReinstall,
  matchingPreset,
  parkedCount,
  presetOptions,
  presetSelection,
  toggleSelection,
  wizardGroups,
  wizardPreview,
  wizardSelection
} from '../../../lib';
import { useInstallMutation } from '../use-install-mutation';
import { useInstallPlan } from '../use-install-plan';
import { useLoadProfile } from '../use-load-profile';

export const useInstallWizardState = ({ initialPreset, initialComponents, startAtReview, profileId }: UseInstallWizardStateInput) => {
  const locale = useLocale();
  const { clientPath } = useSelectedClient();
  const { navigate } = useNavigation();
  const planQuery = useInstallPlan(clientPath);
  const install = useInstallMutation({ clientPath, profileId });
  const [pickedStep, setPickedStep] = useState<number | null>(startAtReview ? LAST_WIZARD_STEP : null);
  const [chosenFor, setChosenFor] = useState<ClientScoped | null>(null);
  const [removeOthersFor, setRemoveOthersFor] = useState<ClientScoped | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const setChosen = (selection: Selection) => setChosenFor({ clientPath, selection });
  const plan = planQuery.data ?? null;
  const catalog = plan?.catalog ?? null;
  const components = catalog?.components ?? [];
  const loadProfile = useLoadProfile({ components, onLoaded: setChosen });

  const presets = catalog?.presets ?? [];
  const chosen = chosenFor?.clientPath === clientPath ? chosenFor.selection : null;
  const removeOthers = removeOthersFor?.clientPath === clientPath ? removeOthersFor.selection : new Set<string>();
  const selection = chosen ?? wizardSelection({ plan, components, presetId: defaultPreset({ presets, initialPreset }), initialComponents });
  const groups = wizardGroups({ catalog, selection, locale });
  const blocker = plan && installBlocker(plan);
  const isClientSupported = plan !== null && plan.client.problem === null;
  const stepIndex = pickedStep ?? (isClientSupported ? INSTALL_WIZARD.steps.indexOf('components') : 0);
  const stepBy = (delta: number) => setPickedStep(clamp(stepIndex + delta, { min: 0, max: LAST_WIZARD_STEP }));

  return {
    clientPath,
    planQuery,
    plan,
    step: INSTALL_WIZARD.steps[stepIndex] ?? INSTALL_WIZARD.steps[0],
    stepIndex,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === LAST_WIZARD_STEP,
    presetId: matchingPreset({ components, presets, selection }),
    presetOptions: presetOptions({ presets, locale }),
    groups,
    chosenGroups: chosenGroups(groups),
    preview: wizardPreview({ catalog, focusedId, locale }),
    selectedCount: selection.size,
    totalCount: components.length,
    removeOthers,
    isReinstall: isReinstall(plan),
    isClientSupported,
    isOffline: blocker === 'offline',
    parkedCount: parkedCount({ parked: plan?.parkedComponents ?? [], selection }),
    canInstall: clientPath !== null && plan !== null && blocker === null,
    blocker,
    isInstalling: install.isPending,
    isLoadingProfile: loadProfile.isPending,
    goTo: setPickedStep,
    goNext: () => stepBy(1),
    goBack: () => stepBy(-1),
    onCancel: () => navigate({ page: PAGES.initial }),
    onPresetChange: (id: string) => setChosen(presetSelection({ components, presetId: id })),
    onToggle: ({ id, checked }: ToggleInput) => setChosen(toggleSelection({ components, selection, id, checked })),
    onFocus: setFocusedId,
    onToggleOther: ({ id, checked }: ToggleInput) =>
      setRemoveOthersFor({ clientPath, selection: toggledSet({ set: removeOthers, item: id, isOn: checked }) }),
    onLoadProfile: () => loadProfile.mutate(),
    onInstall: () => install.mutate({ clientPath, components: [...selection], removeOthers: [...removeOthers] })
  };
};
