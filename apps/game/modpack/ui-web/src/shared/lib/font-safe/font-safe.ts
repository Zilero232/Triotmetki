import { mapValues } from 'remeda';

import type { RichLine } from '@/shared/lib/rich-text';

import { isRecord } from '@/shared/lib/is-record';

import { FONT_SAFE } from './font-safe.constants';

const kept = new Set(FONT_SAFE.kept);
const replacements: Partial<Record<string, string>> = FONT_SAFE.replacements;

const safeChar = (char: string): string => {
  if ((char.codePointAt(0) ?? 0) < FONT_SAFE.firstUnsafe || kept.has(char)) {
    return char;
  }

  return replacements[char] ?? '';
};

export const fontSafe = (text: string): string => Array.from(text, safeChar).join('');

export const fontSafeWalker = (keptKeys: readonly string[] = []) => {
  const keptKey: ReadonlySet<string> = new Set(keptKeys);

  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return fontSafe(value);
    }

    if (Array.isArray(value)) {
      return value.map(walk);
    }

    return isRecord(value) ? mapValues(value, (item, key) => (keptKey.has(key) ? item : walk(item))) : value;
  };

  return walk;
};

export const fontSafeData = fontSafeWalker();

export const fontSafeLines = (lines: RichLine[]): RichLine[] =>
  lines.map((line) => ({ ...line, runs: line.runs.map((run) => (run.kind === 'text' ? { ...run, text: fontSafe(run.text) } : run)) }));
