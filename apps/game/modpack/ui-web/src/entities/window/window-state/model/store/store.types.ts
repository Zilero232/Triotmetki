import type { SettingValue } from '@/shared/api/protocol';

import type { SECTION } from '../../config';

export type Section = (typeof SECTION)[keyof typeof SECTION];

export type View = {
  section: Section;
};

export type OpenSettingInput = {
  componentId: string;
  key: string | null;
};

export type UndoKind = 'field' | 'reset' | 'switch';

export type UndoEntry = {
  id: number;
  kind: UndoKind;
  component: string;
  title: string;
  label: string;
  switchedOn: boolean;
  values: Record<string, SettingValue>;
};
