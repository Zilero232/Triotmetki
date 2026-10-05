import type { TankSnapshotRow } from '../snapshots/snapshots.types';

export type TankKey = {
  accountId: bigint;
  tankId: number;
};

export type TankMarks = TankKey & {
  marks: number;
};

type StoredTankMarks = TankKey & {
  marksOnGun: number | null;
};

export type GainedMarksInput = {
  current: readonly TankMarks[];
  previous: readonly StoredTankMarks[];
};

export type GainedMark = TankMarks & {
  previous: number;
};

export type SnapshotMarksInput = readonly Pick<TankSnapshotRow, 'accountId' | 'marksOnGun' | 'tankId'>[];
