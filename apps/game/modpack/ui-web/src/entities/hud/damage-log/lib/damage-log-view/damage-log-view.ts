import { formatNumber } from '@/shared/lib/format-number';

import type { DamageLogData, DamageLogRow } from '../../model/schemas';
import type { DamageLogRowView, DamageLogSectionView, DamageLogView } from './damage-log-view.types';

import { DAMAGE_LOG } from '../../config';

const rowBar = ({ hp, max }: DamageLogRow): DamageLogRowView['bar'] => (hp !== null && max !== null ? { value: hp, max } : null);

const rowView = (row: DamageLogRow): DamageLogRowView => ({
  id: row.id,
  tone: row.tone,
  icon: row.icon,
  shell: row.shell,
  cls: row.cls,
  name: row.name,
  note: row.note,
  amountText: row.amount === null ? '' : formatNumber(row.amount),
  muted: row.amount === null,
  hitsText: row.hits > 1 ? `${DAMAGE_LOG.hitsPrefix}${row.hits}` : '',
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
