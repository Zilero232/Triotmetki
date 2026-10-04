import type * as z from 'zod/mini';

import type { HIT_VIEWER } from '../../config';
import type { viewerMarksSchema, viewerStateSchema } from './viewer-protocol.schemas';

export type ViewerState = z.infer<typeof viewerStateSchema>;
export type ViewerMarks = z.infer<typeof viewerMarksSchema>;
export type ViewerMark = ViewerMarks['marks'][number];
export type ViewerRow = ViewerState['rows'][number];
export type ViewerBattle = NonNullable<ViewerState['battle']>;
export type ViewerSide = (typeof HIT_VIEWER.sides)[number];

export type ViewerMessage =
  | { command: 'battle'; id: string }
  | { command: 'close' }
  | { command: 'ready' }
  | { command: 'select'; index: number }
  | { command: 'tab'; tab: ViewerSide };
