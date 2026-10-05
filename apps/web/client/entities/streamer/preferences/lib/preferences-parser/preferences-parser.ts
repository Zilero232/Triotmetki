import { settingsValuesSchema } from '@otmetki/schemas';
import { isIncludedIn, mergeDeep, round } from 'remeda';
import { match } from 'ts-pattern';

import type { AddValueInput, NestedInput, PreferencesImport, ReadTagInput, ToValueInput } from './preferences-parser.types';

import { PREFERENCES_BLOCKED_TAGS, PREFERENCES_TAGS, PREFERENCES_VALUES } from '../../config';

const isBlocked = (element: Element): boolean => {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (PREFERENCES_BLOCKED_TAGS.has(node.tagName.toLowerCase())) {
      return true;
    }
  }

  return false;
};

const readTag = ({ document, selectors }: ReadTagInput): string | null => {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const text = element.textContent.trim();

      if (element.children.length === 0 && !isBlocked(element) && text.length > 0 && text.length <= PREFERENCES_VALUES.maxTextLength) {
        return text;
      }
    }
  }

  return null;
};

const toNumber = (text: string): number | null => (PREFERENCES_VALUES.number.test(text) ? Number(text) : null);

const toValue = ({ field, text }: ToValueInput): unknown => {
  const lower = text.toLowerCase();
  const number = toNumber(text);

  return match(field)
    .with({ kind: 'boolean' }, () =>
      isIncludedIn(lower, PREFERENCES_VALUES.truthy) ? true : isIncludedIn(lower, PREFERENCES_VALUES.falsy) ? false : null
    )
    .with({ kind: 'integer' }, () => (number === null ? null : Math.round(number)))
    .with({ kind: 'decimal' }, () => (number === null ? null : round(number, PREFERENCES_VALUES.decimalDigits)))
    .with({ kind: 'index' }, ({ options }) => (number !== null && Number.isInteger(number) ? (options[number] ?? null) : null))
    .exhaustive();
};

const nested = ({ path, value }: NestedInput): Record<string, unknown> => {
  const [head = '', ...rest] = path.split('.');

  return { [head]: rest.length === 0 ? value : nested({ path: rest.join('.'), value }) };
};

const addValue = ({ target, path, value }: AddValueInput): void => {
  if (value === null || value === undefined) {
    return;
  }

  const parsed = settingsValuesSchema.safeParse(nested({ path, value }));

  if (!parsed.success) {
    return;
  }

  target.values = mergeDeep(target.values, parsed.data);
  target.found.push(path);
};

const readResolution = (document: Document): string | null => {
  for (const { width, height } of PREFERENCES_TAGS.resolution) {
    const w = toNumber(readTag({ document, selectors: [width] }) ?? '');
    const h = toNumber(readTag({ document, selectors: [height] }) ?? '');

    if (w !== null && h !== null && Number.isInteger(w) && Number.isInteger(h)) {
      return `${w}x${h}`;
    }
  }

  return null;
};

export const parsePreferences = (xml: string): PreferencesImport => {
  const result: PreferencesImport = { values: {}, found: [] };
  const document = new DOMParser().parseFromString(xml, 'application/xml');

  if (document.getElementsByTagName('parsererror').length > 0) {
    return result;
  }

  addValue({ target: result, path: 'display.resolution', value: readResolution(document) });

  for (const field of PREFERENCES_TAGS.fields) {
    const text = readTag({ document, selectors: field.selectors });

    addValue({ target: result, path: field.path, value: text === null ? null : toValue({ field, text }) });
  }

  return result;
};
