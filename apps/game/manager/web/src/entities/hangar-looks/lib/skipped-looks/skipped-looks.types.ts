import type { HangarLooksStatus, SkipReason } from '../../api';

export type SkippedLook = {
  id: string;
  title: string;
  reason: SkipReason;
};

export type SkippedLooksInput = Pick<HangarLooksStatus, 'skipped'>;
