import type { DAMAGE_LOG } from '../../config';
import type { DamageLogRow, DamageLogTotal } from '../../model/schemas';

export type DamageLogTotalView = DamageLogTotal & { text: string };

export type DamageLogShellKind = (typeof DAMAGE_LOG.shellKinds)[number] | typeof DAMAGE_LOG.otherShell;

export type DamageLogShellView = { label: string; gold: boolean; kind: DamageLogShellKind };

export type DamageLogBarView = { kept: number; took: number };

export type TookWidthInput = { lost: number; max: number; kept: number };

export type DamageLogRowTexts = {
  amountText: string;
  hitsText: string;
  critsText: string;
};

export type DamageLogRowView = Pick<DamageLogRow, 'cls' | 'icon' | 'id' | 'name' | 'note' | 'tone'> &
  DamageLogRowTexts & {
    muted: boolean;
    shell: DamageLogShellView | null;
    bar: DamageLogBarView | null;
    ammoRack: DamageLogRow['ammo_rack'];
  };

export type DamageLogSectionView = { key: (typeof DAMAGE_LOG.sections)[number]; rows: DamageLogRowView[] };

export type DamageLogView = { wide: boolean; totals: DamageLogTotalView[]; sections: DamageLogSectionView[] };
