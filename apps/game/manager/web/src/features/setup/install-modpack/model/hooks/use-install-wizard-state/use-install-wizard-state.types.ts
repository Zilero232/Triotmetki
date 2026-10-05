import type { Selection } from '../../../lib';

export type UseInstallWizardStateInput = {
  initialPreset: string | null;
  initialComponents: string[] | null;
  startAtReview: boolean;
};

export type ToggleInput = {
  id: string;
  checked: boolean;
};

export type ClientScoped = {
  clientPath: string | null;
  selection: Selection;
};
