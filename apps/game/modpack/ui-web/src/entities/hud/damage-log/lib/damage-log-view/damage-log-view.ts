import { formatNumber } from '@/shared/lib/format-number';

import type { DamageLogData, DamageLogRow } from '../../model/schemas';
import type { DamageLogBarView, DamageLogRowView, DamageLogSectionView, DamageLogShellKind, DamageLogView } from './damage-log-view.types';

import { DAMAGE_LOG } from '../../config';

const shellKind = (code: string): DamageLogShellKind => DAMAGE_LOG.shellKinds.find((kind) => kind === code) ?? DAMAGE_LOG.otherShell;

const rowShell = ({ shell }: DamageLogRow): DamageLogRowView['shell'] =>
  shell ? { label: shell.label, gold: shell.gold, kind: shellKind(shell.code) } : null;

const barWidth = (share: number): number => Math.round(Math.min(Math.max(share, 0), 1) * DAMAGE_LOG.bar.width);

const rowBar = ({ hp, max, amount }: DamageLogRow): DamageLogBarView | null => {
  if (hp === null || max === null || max <= 0) {
    return null;
  }

  const lost = Math.min(Math.abs(amount ?? 0), Math.max(max - hp, 0));
  const kept = barWidth(hp / max);

  return { kept, took: lost > 0 ? Math.max(1, Math.min(barWidth(lost / max), DAMAGE_LOG.bar.width - kept)) : 0 };
};

const rowView = (row: DamageLogRow): DamageLogRowView => ({
  id: row.id,
  tone: row.tone,
  icon: row.icon,
  shell: rowShell(row),
  cls: row.cls,
  name: row.name,
  note: row.note,
  amountText: row.amount === null ? '' : formatNumber(row.amount),
  muted: row.amount === null,
  hitsText: row.hits > 1 ? `${DAMAGE_LOG.hitsPrefix}${row.hits}` : '',
  critsText: row.crits > 0 ? String(row.crits) : '',
  bar: rowBar(row),
  ammoRack: row.ammo_rack
});

export const damageLogView = (data: DamageLogData): DamageLogView => {
  const sections: DamageLogSectionView[] = [
    { key: 'dealt', rows: data.dealt.map(rowView) },
    { key: 'received', rows: data.received.map(rowView) }
  ];

  return {
    wide: data.wide,
    totals: data.totals.map((total) => ({ ...total, text: formatNumber(total.value) })),
    sections: sections.filter((section) => section.rows.length > 0)
  };
};
