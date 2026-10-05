import type { z } from 'zod';

import type { DialogText } from '@/shared/api';

import type { componentSetSchema, setsViewSchema } from './component-sets.schemas';

export type ComponentSet = z.infer<typeof componentSetSchema>;

export type SetsView = z.infer<typeof setsViewSchema>;

export type SaveSetInput = {
  name: string;
  components: string[];
};

export type RenameSetInput = {
  id: string;
  name: string;
};

export type ImportSetInput = {
  code: string;
  name: string | null;
};

export type ExportSetFileInput = {
  id: string;
  text: DialogText;
};
