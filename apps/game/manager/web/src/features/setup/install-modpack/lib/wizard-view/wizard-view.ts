import { previewSrc } from '@/entities/catalog';
import { pickLocalized } from '@/shared/lib';

import type { Selection } from '../selection';
import type {
  DefaultPresetInput,
  ParkedCountInput,
  PresetOption,
  PresetOptionsInput,
  WizardGroup,
  WizardGroupsInput,
  WizardPreview,
  WizardPreviewInput,
  WizardSelectionInput
} from './wizard-view.types';

import { closeDependencies, presetSelection } from '../selection';

export const wizardGroups = ({ catalog, selection, locale }: WizardGroupsInput): WizardGroup[] => {
  const components = catalog?.components ?? [];
  const categories = catalog?.categories ?? [];
  const groups = categories.map((category) => ({
    id: category.id,
    title: pickLocalized({ text: category.title, locale }),
    components: components
      .filter((component) => component.category === category.id)
      .map((component) => ({
        id: component.id,
        title: pickLocalized({ text: component.title, locale }),
        required: component.required,
        checked: selection.has(component.id)
      }))
  }));

  return groups.filter((group) => group.components.length > 0);
};

export const chosenGroups = (groups: readonly WizardGroup[]): WizardGroup[] =>
  groups
    .map((group) => ({ ...group, components: group.components.filter((component) => component.checked) }))
    .filter((group) => group.components.length > 0);

export const wizardPreview = ({ catalog, focusedId, locale }: WizardPreviewInput): WizardPreview | null => {
  const components = catalog?.components ?? [];
  const focused = components.find((component) => component.id === focusedId) ?? components[0];

  if (!focused) {
    return null;
  }

  const previewsDir = catalog?.previewsDir ?? null;

  return {
    category: focused.category,
    title: pickLocalized({ text: focused.title, locale }),
    description: pickLocalized({ text: focused.description, locale }),
    fairPlay: pickLocalized({ text: focused.fairPlay, locale }),
    video: focused.preview.video,
    src: previewSrc({ previewsDir, file: focused.preview.image }),
    audioSrc: previewSrc({ previewsDir, file: focused.preview.audio }),
    perf: focused.perf
  };
};

export const defaultPreset = ({ presets, initialPreset }: DefaultPresetInput): string | null =>
  presets.find((preset) => preset.id === initialPreset)?.id ?? presets[0]?.id ?? null;

export const isReinstall = (plan: WizardSelectionInput['plan']): boolean => plan?.installed === true && plan.currentComponents.length > 0;

export const wizardSelection = ({ plan, components, presetId, initialComponents }: WizardSelectionInput): Selection => {
  if (initialComponents) {
    return closeDependencies({ components, ids: initialComponents });
  }

  if (plan && isReinstall(plan)) {
    return closeDependencies({ components, ids: plan.currentComponents });
  }

  return presetSelection({ components, presetId });
};

export const presetOptions = ({ presets, locale }: PresetOptionsInput): PresetOption[] =>
  presets.map((preset) => ({ value: preset.id, label: pickLocalized({ text: preset.title, locale }) }));

export const parkedCount = ({ parked, selection }: ParkedCountInput): number => parked.filter((id) => selection.has(id)).length;
