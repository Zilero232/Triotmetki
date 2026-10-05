import { sortBy } from 'remeda';

import type { UiComponent, UiField } from '@/shared/api/protocol';
import type { UiIconName } from '@/shared/lib/icon-sprite';

import { PROTOCOL } from '@/shared/api/protocol';

import type { ComponentsOfInput, ComponentValues, FieldRef, SearchHit, SearchInput, SectionSummary } from './components.types';

import { COMPONENT_ICONS, FALLBACK_COMPONENT_ICON, WINDOW_VIEW } from '../../config';

const normalize = (text: string | null | undefined): string => (text ?? '').toLowerCase().replaceAll('ё', 'е').trim();

const isCyrillic = (title: string): boolean => {
  const code = title.charCodeAt(0);

  return code >= WINDOW_VIEW.cyrillic.first && code <= WINDOW_VIEW.cyrillic.last;
};

const scriptRank = (title: string): number => (isCyrillic(title) ? 0 : 1);

export const isEnabled = (component: UiComponent): boolean => component.switch?.value ?? true;

export const componentIcon = (componentId: string): UiIconName => COMPONENT_ICONS[componentId] ?? FALLBACK_COMPONENT_ICON;

export const componentsOf = ({ components, section, context }: ComponentsOfInput): UiComponent[] =>
  sortBy(
    components.filter(
      (component) => component.section === section && (context === 'all' || component.context === context || component.context === 'any')
    ),
    ({ title }) => scriptRank(title),
    ({ title }) => normalize(title)
  );

export const summarize = (components: UiComponent[]): SectionSummary[] =>
  PROTOCOL.sections.map((section) => {
    const members = components.filter((component) => component.section === section);

    return { section, total: members.length, enabled: members.filter(isEnabled).length };
  });

const fieldText = (field: UiField): string =>
  normalize([field.label, field.hint, ...(field.type === 'choice' ? field.choices.map(({ label }) => label) : [])].join(' '));

export const searchComponents = ({ components, query }: SearchInput): SearchHit[] => {
  const needle = normalize(query);

  if (needle.length < WINDOW_VIEW.searchMinLength) {
    return [];
  }

  return components.flatMap((component): SearchHit[] => {
    const fields = component.fields.filter((field) => fieldText(field).includes(needle));
    const own = normalize(`${component.title} ${component.hint ?? ''}`).includes(needle);

    if (own) {
      return [{ component, fields: component.fields }];
    }

    return fields.length > 0 ? [{ component, fields }] : [];
  });
};

export const isChanged = (field: UiField): boolean => field.value !== field.default;

export const changedFields = (component: UiComponent): UiField[] => component.fields.filter(isChanged);

export const defaultValues = (component: UiComponent): ComponentValues =>
  Object.fromEntries(changedFields(component).map((field) => [field.key, field.default]));

export const currentValues = (component: UiComponent): ComponentValues =>
  Object.fromEntries(changedFields(component).map((field) => [field.key, field.value]));

export const valueOf = ({ component, key }: FieldRef): UiField['value'] | null =>
  component.switch?.key === key ? component.switch.value : (component.fields.find((field) => field.key === key)?.value ?? null);

export const labelOf = ({ component, key }: FieldRef): string =>
  component.switch?.key === key ? component.title : (component.fields.find((field) => field.key === key)?.label ?? key);
