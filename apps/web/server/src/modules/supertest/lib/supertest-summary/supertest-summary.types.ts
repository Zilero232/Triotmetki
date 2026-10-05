import type { ChangeVerdict } from '../change-verdict/change-verdict.types';

type SummaryTank = {
  key: string;
  tankId: number | null;
  changes: ReadonlyArray<{ verdict: ChangeVerdict }>;
};

export type SummaryAnnouncement = {
  tanks: readonly SummaryTank[];
};

export type NarrowInput<T extends SummaryAnnouncement> = {
  announcements: readonly T[];
  tankIds: ReadonlySet<number>;
};
