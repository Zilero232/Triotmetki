import type { ApplicableGroup, StreamerSettings } from '@otmetki/schemas';
import type { z } from 'zod';

import type { applyFormSchema } from './apply-form.schemas';

export type ApplyFormValues = z.infer<typeof applyFormSchema>;

export type HardwareOptionsInput = {
  settings: StreamerSettings;
  groups: readonly ApplicableGroup[];
};

export type HardwareOptions = {
  hasResolution: boolean;
  hasSensitivity: boolean;
};

export type ToApplyRequestInput = {
  slug: string;
  values: ApplyFormValues;
  options: HardwareOptions;
};

export type HasAnyInput = {
  group: Record<string, unknown> | undefined;
  keys: readonly string[];
};
