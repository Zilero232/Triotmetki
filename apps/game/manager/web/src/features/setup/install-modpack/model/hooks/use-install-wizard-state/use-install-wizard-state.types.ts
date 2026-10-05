import type { Selection } from '../../../lib';

export type UseInstallWizardStateInput = {
  initialPreset: string | null;
  initialComponents: string[] | null;
  startAtReview: boolean;
  profileId: string | null;
};

export type ToggleInput = {
  id: string;
  checked: boolean;
};

export type ClientScoped = {
  clientPath: string | null;
  selection: Selection;
};
