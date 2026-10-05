import { pickLocalized } from '@/shared/lib';

import type { ConflictItem, ConflictItemsInput } from './conflict-items.types';

export const conflictItems = ({ report, catalog, locale }: ConflictItemsInput): ConflictItem[] => {
  const titles = new Map(catalog?.components.map((component) => [component.id, pickLocalized({ text: component.title, locale })]));
  const rules = new Map(catalog?.conflicts.map((rule) => [rule.id, rule]));
  const titleOf = (id: string) => titles.get(id) ?? id;
  const items: ConflictItem[] = [];

  if (report.missing.length > 0) {
    items.push({
      key: 'missing',
      kind: 'missing',
      subject: '',
      components: report.missing.map((item) => titleOf(item.id)),
      files: [],
      count: report.missing.length,
      note: null
    });
  }

  if (report.replaced.length > 0) {
    items.push({
      key: 'replaced',
      kind: 'replaced',
      subject: '',
      components: report.replaced.map((item) => titleOf(item.id)),
      files: report.replaced.map((item) => item.file),
      count: report.replaced.length,
      note: null
    });
  }

  for (const duplicate of report.duplicates) {
    items.push({
      key: `duplicate:${duplicate.packageId}`,
      kind: duplicate.ours ? 'duplicateOurs' : 'duplicate',
      subject: duplicate.packageId,
      components: [],
      files: duplicate.files,
      count: duplicate.files.length,
      note: null
    });
  }

  for (const conflict of report.foreign) {
    const rule = rules.get(conflict.rule);

    items.push({
      key: `foreign:${conflict.file}:${conflict.rule}`,
      kind: 'foreign',
      subject: rule ? pickLocalized({ text: rule.title, locale }) : conflict.rule,
      components: conflict.components.map(titleOf),
      files: [conflict.file],
      count: 1,
      note: rule ? pickLocalized({ text: rule.note, locale }) : null
    });
  }

  for (const override of report.overrides) {
    items.push({
      key: `override:${override.file}`,
      kind: override.location === 'res_mods' ? 'overrideResMods' : 'override',
      subject: override.file,
      components: [],
      files: override.paths,
      count: override.count,
      note: null
    });
  }

  return items;
};

export const restorableCount = (report: ConflictItemsInput['report']): number =>
  new Set([...report.missing, ...report.replaced].map((item) => item.id)).size;
