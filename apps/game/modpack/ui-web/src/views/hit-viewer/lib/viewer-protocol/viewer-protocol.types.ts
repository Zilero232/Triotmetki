import type * as z from 'zod/mini';

import type { HIT_VIEWER } from '../../config';
import type { viewerStateSchema } from './viewer-protocol.schemas';

export type ViewerState = z.infer<typeof viewerStateSchema>;
export type ViewerRow = ViewerState['rows'][number];
export type ViewerBattle = NonNullable<ViewerState['battle']>;
export type ViewerSide = (typeof HIT_VIEWER.sides)[number];

export type ViewerMessage =
  | { command: 'battle'; id: string }
  | { command: 'close' }
  | { command: 'diag'; text: string }
  | { command: 'move'; dx: number; dy: number; dz: number }
  | { command: 'ready' }
  | { command: 'select'; index: number }
  | { command: 'tab'; tab: ViewerSide };

export type ParseWithInput<Schema extends z.ZodMiniType> = { schema: Schema; raw: string | null };
