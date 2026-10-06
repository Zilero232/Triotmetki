import type {
  CloseDependenciesInput,
  DependentsInput,
  MatchingPresetInput,
  PresetSelectionInput,
  SameSelectionInput,
  Selection,
  ToggleSelectionInput
} from './selection.types';

import { INSTALL_WIZARD } from '../../config';

export const closeDependencies = ({ components, ids }: CloseDependenciesInput): Selection => {
  const byId = new Map(components.map((component) => [component.id, component]));
  const result = new Set<string>();
  const pending = [...ids, ...components.filter((component) => component.required).map((component) => component.id)];

  while (pending.length > 0) {
    const id = pending.pop();
    const component = id === undefined ? undefined : byId.get(id);

    if (component && !result.has(component.id)) {
      result.add(component.id);
      pending.push(...component.dependencies);
    }
  }

  return result;
};

const dependentsOf = ({ components, id }: DependentsInput): Set<string> => {
  const result = new Set([id]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const component of components) {
      if (!result.has(component.id) && component.dependencies.some((dependency) => result.has(dependency))) {
        result.add(component.id);
        changed = true;
      }
    }
  }

  return result;
};

export const presetSelection = ({ components, presetId }: PresetSelectionInput): Selection =>
  closeDependencies({
    components,
    ids: components.filter((component) => presetId !== null && component.presets.includes(presetId)).map((component) => component.id)
  });

export const toggleSelection = ({ components, selection, id, checked }: ToggleSelectionInput): Selection => {
  if (checked) {
    return closeDependencies({ components, ids: [...selection, id] });
  }

  const removed = dependentsOf({ components, id });

  if (components.some((component) => component.required && removed.has(component.id))) {
    return selection;
  }

  return new Set([...selection].filter((selected) => !removed.has(selected)));
};

const sameSelection = ({ left, right }: SameSelectionInput): boolean => left.size === right.size && [...left].every((id) => right.has(id));

export const matchingPreset = ({ components, presets, selection }: MatchingPresetInput): string => {
  const match = presets.find(
    (preset) => !preset.custom && sameSelection({ left: presetSelection({ components, presetId: preset.id }), right: selection })
  );

  return match?.id ?? presets.find((preset) => preset.custom)?.id ?? INSTALL_WIZARD.customPreset;
};
