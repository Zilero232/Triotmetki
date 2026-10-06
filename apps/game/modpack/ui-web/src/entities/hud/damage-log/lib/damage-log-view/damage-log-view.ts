import { clamp, isIncludedIn, pick } from 'remeda';

import { formatNumber } from '@/shared/lib/format-number';

import type { DamageLogData, DamageLogRow } from '../../model/schemas';
import type {
  DamageLogBarView,
  DamageLogRowTexts,
  DamageLogRowView,
  DamageLogShellKind,
  DamageLogShellView,
  DamageLogView,
  TookWidthInput
} from './damage-log-view.types';

import { DAMAGE_LOG } from '../../config';

const { bar } = DAMAGE_LOG;

const shellKind = (code: string): DamageLogShellKind => (isIncludedIn(code, DAMAGE_LOG.shellKinds) ? code : DAMAGE_LOG.otherShell);

const rowShell = ({ shell }: DamageLogRow): DamageLogShellView | null => {
  if (shell === null) {
    return null;
  }

  return { label: shell.label, gold: shell.gold, kind: shellKind(shell.code) };
};

const barWidth = (share: number): number => {
  const shown = clamp(share, { min: 0, max: 1 });

  return Math.round(shown * bar.width);
};

const tookWidth = ({ lost, max, kept }: TookWidthInput): number => {
  if (lost <= 0) {
    return 0;
  }

  const room = bar.width - kept;
  const width = Math.min(barWidth(lost / max), room);

  return Math.max(width, bar.minTook);
};

const rowBar = ({ hp, max, amount }: DamageLogRow): DamageLogBarView | null => {
  if (hp === null || max === null || max <= 0) {
    return null;
  }

  const missing = Math.max(max - hp, 0);
  const lost = Math.min(Math.abs(amount ?? 0), missing);
  const kept = barWidth(hp / max);

  return { kept, took: tookWidth({ lost, max, kept }) };
};

const rowTexts = ({ amount, hits, crits }: DamageLogRow): DamageLogRowTexts => ({
  amountText: amount === null ? '' : formatNumber(amount),
  hitsText: hits > 1 ? `${DAMAGE_LOG.hitsPrefix}${hits}` : '',
  critsText: crits > 0 ? String(crits) : ''
});

const rowView = (row: DamageLogRow): DamageLogRowView => ({
  ...pick(row, ['id', 'tone', 'icon', 'cls', 'name', 'note']),
  ...rowTexts(row),
  muted: row.amount === null,
  shell: rowShell(row),
  bar: rowBar(row),
  ammoRack: row.ammo_rack
});

export const damageLogView = (data: DamageLogData): DamageLogView => {
  const sections = DAMAGE_LOG.sections.map((key) => ({ key, rows: data[key].map(rowView) }));
  const totals = data.totals.map((total) => ({ ...total, text: formatNumber(total.value) }));

  return {
    wide: data.wide,
    totals,
    sections: sections.filter(({ rows }) => rows.length > 0)
  };
};
