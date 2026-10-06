import type { DAMAGE_LOG } from '../../config';
import type { DamageLogRow, DamageLogTotal } from '../../model/schemas';

export type DamageLogTotalView = DamageLogTotal & { text: string };

export type DamageLogShellKind = (typeof DAMAGE_LOG.shellKinds)[number] | typeof DAMAGE_LOG.otherShell;

export type DamageLogShellView = { label: string; gold: boolean; kind: DamageLogShellKind };

export type DamageLogBarView = { kept: number; took: number };

export type DamageLogRowView = Pick<DamageLogRow, 'cls' | 'icon' | 'id' | 'name' | 'note' | 'tone'> & {
  amountText: string;
  muted: boolean;
  hitsText: string;
  critsText: string;
  shell: DamageLogShellView | null;
  bar: DamageLogBarView | null;
  ammoRack: DamageLogRow['ammo_rack'];
};

export type DamageLogSectionView = { key: 'dealt' | 'received'; rows: DamageLogRowView[] };

export type DamageLogView = { wide: boolean; totals: DamageLogTotalView[]; sections: DamageLogSectionView[] };
