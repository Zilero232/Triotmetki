import type { SettingValue, UiComponent, UiField, UiSection } from '@/shared/api/protocol';

export type ComponentsOfInput = {
  components: UiComponent[];
  section: string;
};

export type SectionSummary = {
  section: UiSection;
  total: number;
  enabled: number;
};

export type SearchInput = {
  components: UiComponent[];
  query: string;
};

export type SearchHit = {
  component: UiComponent;
  fields: UiField[];
};

export type ComponentValues = Record<string, SettingValue>;

export type FieldRef = {
  component: UiComponent;
  key: string;
};
