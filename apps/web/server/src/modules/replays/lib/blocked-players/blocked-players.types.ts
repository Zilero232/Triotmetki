import type { ReplaySummary } from '../../../../lib/replay';

export type AnonymiseBlockedInput = {
  summary: ReplaySummary;
  blocked: ReadonlySet<number>;
  placeholder: string;
};
