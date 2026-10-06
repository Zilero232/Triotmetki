import type { CatalogComponent, CatalogPreset } from '@/entities/catalog';

export type Selection = ReadonlySet<string>;

export type SelectionComponents = readonly Pick<CatalogComponent, 'dependencies' | 'id' | 'presets' | 'required'>[];

export type CloseDependenciesInput = {
  components: SelectionComponents;
  ids: Iterable<string>;
};

export type PresetSelectionInput = {
  components: SelectionComponents;
  presetId: string | null;
};

export type ToggleSelectionInput = {
  components: SelectionComponents;
  selection: Selection;
  id: string;
  checked: boolean;
};

export type MatchingPresetInput = {
  components: SelectionComponents;
  presets: readonly Pick<CatalogPreset, 'custom' | 'id'>[];
  selection: Selection;
};

export type DependentsInput = {
  components: SelectionComponents;
  id: string;
};

export type SameSelectionInput = {
  left: Selection;
  right: Selection;
};
