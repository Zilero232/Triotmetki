import type { Catalog, CatalogComponent, CatalogPreset } from '@/entities/catalog';
import type { Locale } from '@/shared/i18n';

import type { InstallPlan } from '../../api';
import type { Selection, SelectionPresets } from '../selection';

export type WizardCatalog = Pick<Catalog, 'categories' | 'components' | 'previewsDir'>;

export type WizardComponent = {
  id: string;
  title: string;
  required: boolean;
  checked: boolean;
};

export type WizardGroup = {
  id: string;
  title: string;
  components: WizardComponent[];
};

export type WizardGroupsInput = {
  catalog: WizardCatalog | null;
  selection: Selection;
  locale: Locale;
};

export type WizardPreview = {
  category: string;
  title: string;
  description: string;
  fairPlay: string;
  video: string | null;
  src: string | null;
  audioSrc: string | null;
  perf: CatalogComponent['perf'];
};

export type WizardPreviewInput = {
  catalog: WizardCatalog | null;
  focusedId: string | null;
  locale: Locale;
};

export type WizardSelectionInput = {
  plan: Pick<InstallPlan, 'currentComponents' | 'installed'> | null;
  components: readonly CatalogComponent[];
  presets: SelectionPresets;
  presetId: string | null;
  initialComponents: string[] | null;
};

export type DefaultPresetInput = {
  presets: readonly { id: string }[];
  initialPreset: string | null;
};

export type ParkedCountInput = {
  parked: readonly string[];
  selection: Selection;
};

export type PresetOptionsInput = {
  presets: readonly Pick<CatalogPreset, 'id' | 'title'>[];
  locale: Locale;
};

export type PresetOption = {
  value: string;
  label: string;
};
