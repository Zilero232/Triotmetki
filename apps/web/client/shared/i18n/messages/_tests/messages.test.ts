import { describe, expect, it } from 'vitest';

import { messages } from '..';
import { LOCALES } from '../../locale';

const leaves = (value: unknown, prefix = ''): [string, unknown][] => {
  if (typeof value !== 'object' || value === null) {
    return [[prefix, value]];
  }

  return Object.entries(value).flatMap(([key, nested]) => leaves(nested, prefix ? `${prefix}.${key}` : key));
};

const CASE_ARGUMENT_TYPES = new Set(['plural', 'select', 'selectordinal']);

const closingBrace = (text: string, open: number) => {
  let depth = 0;

  for (let index = open; index < text.length; index += 1) {
    depth += text[index] === '{' ? 1 : 0;
    depth -= text[index] === '}' ? 1 : 0;

    if (depth === 0) {
      return index;
    }
  }

  return text.length;
};

const caseBodies = (text: string) => {
  const bodies: string[] = [];
  let index = text.indexOf('{');

  while (index !== -1) {
    const end = closingBrace(text, index);

    bodies.push(text.slice(index + 1, end));
    index = text.indexOf('{', end + 1);
  }

  return bodies;
};

const messageArguments = (text: string): string[] => {
  const names: string[] = [];
  let open = text.indexOf('{');

  while (open !== -1) {
    const end = closingBrace(text, open);
    const [name = '', type = '', ...rest] = text.slice(open + 1, end).split(',');

    names.push(name.trim());

    if (CASE_ARGUMENT_TYPES.has(type.trim())) {
      caseBodies(rest.join(',')).forEach((body) => names.push(...messageArguments(body)));
    }

    open = text.indexOf('{', end + 1);
  }

  return [...new Set(names)].sort();
};

describe('messages', () => {
  it('carries every locale the router serves', () => {
    expect(Object.keys(messages).sort()).toEqual([...LOCALES].sort());
  });

  it('holds the same keys in every locale, so no page falls back to a raw key', () => {
    const [reference, ...rest] = LOCALES.map((locale) =>
      leaves(messages[locale])
        .map(([key]) => key)
        .sort()
    );

    rest.forEach((keys) => expect(keys).toEqual(reference));
  });

  it('takes the same arguments in every locale, so no translation drops or renames a value', () => {
    const [reference, ...rest] = LOCALES.map((locale) =>
      Object.fromEntries(leaves(messages[locale]).map(([key, value]) => [key, messageArguments(String(value))]))
    );

    rest.forEach((entries) => expect(entries).toEqual(reference));
  });

  it('leaves no value empty', () => {
    LOCALES.forEach((locale) => {
      const empty = leaves(messages[locale]).filter(([, value]) => typeof value !== 'string' || value.trim() === '');

      expect(empty).toEqual([]);
    });
  });

  it('carries the Lesta attribution the terms require', () => {
    LOCALES.forEach((locale) => {
      expect(messages[locale].footer.lestaCopyright).toMatch(/Лест|Lesta/);
      expect(messages[locale].footer.dataSource).toMatch(/Лест|Lesta/);
    });
  });
});
