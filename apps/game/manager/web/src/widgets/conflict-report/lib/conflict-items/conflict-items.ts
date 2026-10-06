import type { ConflictReport } from '@/entities/conflict';

import { pickLocalized } from '@/shared/lib';

import type { ConflictItem, ConflictItemsInput, ConflictNames, ConflictNamesInput, KindInput } from './conflict-items.types';

import { OVERRIDE_KINDS } from '../../config';

const conflictNames = ({ catalog, locale }: ConflictNamesInput): ConflictNames => {
  const titles = new Map(catalog?.components.map((component) => [component.id, pickLocalized({ text: component.title, locale })]));
  const rules = new Map(catalog?.conflicts.map((rule) => [rule.id, rule]));

  return { titleOf: (id) => titles.get(id) ?? id, ruleOf: (id) => rules.get(id), locale };
};

const missingItems = ({ report, names }: KindInput): ConflictItem[] => {
  if (report.missing.length === 0) {
    return [];
  }

  const components = report.missing.map((item) => names.titleOf(item.id));

  return [{ key: 'missing', kind: 'missing', subject: '', components, files: [], count: report.missing.length, note: null }];
};

const replacedItems = ({ report, names }: KindInput): ConflictItem[] => {
  if (report.replaced.length === 0) {
    return [];
  }

  const components = report.replaced.map((item) => names.titleOf(item.id));
  const files = report.replaced.map((item) => item.file);

  return [{ key: 'replaced', kind: 'replaced', subject: '', components, files, count: report.replaced.length, note: null }];
};

const duplicateItems = (report: ConflictReport): ConflictItem[] =>
  report.duplicates.map((duplicate) => ({
    key: `duplicate:${duplicate.packageId}`,
    kind: duplicate.ours ? 'duplicateOurs' : 'duplicate',
    subject: duplicate.packageId,
    components: [],
    files: duplicate.files,
    count: duplicate.files.length,
    note: null
  }));

const foreignItems = ({ report, names }: KindInput): ConflictItem[] =>
  report.foreign.map((conflict) => {
    const rule = names.ruleOf(conflict.rule);

    return {
      key: `foreign:${conflict.file}:${conflict.rule}`,
      kind: 'foreign',
      subject: rule ? pickLocalized({ text: rule.title, locale: names.locale }) : conflict.rule,
      components: conflict.components.map(names.titleOf),
      files: [conflict.file],
      count: 1,
      note: rule ? pickLocalized({ text: rule.note, locale: names.locale }) : null
    };
  });

const overrideItems = (report: ConflictReport): ConflictItem[] =>
  report.overrides.map((override) => ({
    key: `override:${override.file}`,
    kind: OVERRIDE_KINDS[override.location],
    subject: override.file,
    components: [],
    files: override.paths,
    count: override.count,
    note: null
  }));

export const conflictItems = ({ report, catalog, locale }: ConflictItemsInput): ConflictItem[] => {
  const names = conflictNames({ catalog, locale });
  const input = { report, names };

  return [...missingItems(input), ...replacedItems(input), ...duplicateItems(report), ...foreignItems(input), ...overrideItems(report)];
};

export const restorableCount = (report: ConflictReport): number => new Set([...report.missing, ...report.replaced].map((item) => item.id)).size;
