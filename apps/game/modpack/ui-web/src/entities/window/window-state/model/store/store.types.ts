import type { SettingValue } from '@/shared/api/protocol';

import type { CONTEXT_FILTER, SECTION } from '../../config';

export type Section = (typeof SECTION)[keyof typeof SECTION];

export type ContextFilter = (typeof CONTEXT_FILTER)[keyof typeof CONTEXT_FILTER];

export type View = {
  section: Section;
  expanded: string[];
  context: ContextFilter;
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
