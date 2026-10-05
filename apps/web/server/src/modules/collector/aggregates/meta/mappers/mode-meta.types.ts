import type { PlayMode } from '@otmetki/schemas';

import type { modeMetaRows } from '../queries/mode-meta.queries';

export type ModeMetaRow = Awaited<ReturnType<typeof modeMetaRows>>[number];

export type ToModeRecordInput = {
  row: ModeMetaRow;
  mode: PlayMode;
  windowDays: number;
  computedAt: Date;
};
