import type { DamageLogRow, DamageLogTotal } from '../../model/schemas';

export type DamageLogTotalView = DamageLogTotal & { text: string };

export type DamageLogRowView = Pick<DamageLogRow, 'cls' | 'icon' | 'id' | 'name' | 'note' | 'shell' | 'tone'> & {
  amountText: string;
  muted: boolean;
  hitsText: string;
  bar: { value: number; max: number } | null;
  ammoRack: DamageLogRow['ammo_rack'];
};

export type DamageLogSectionView = { key: 'dealt' | 'received'; rows: DamageLogRowView[] };

export type DamageLogView = { wide: boolean; totals: DamageLogTotalView[]; sections: DamageLogSectionView[] };
