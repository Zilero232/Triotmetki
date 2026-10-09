import { settingsValuesSchema } from '@otmetki/schemas';
import * as z from 'zod';

import type { SettingsFormValues } from './settings-form.types';

import { cleanSettingsForm } from './settings-form';

export const settingsFormSchema = z.preprocess((form: SettingsFormValues) => cleanSettingsForm(form), settingsValuesSchema);
