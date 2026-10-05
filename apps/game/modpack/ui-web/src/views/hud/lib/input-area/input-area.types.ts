import type { Rect, Size } from '@/entities/hud/panel-layout';
import type { InputArea } from '@/shared/api/gameface';

export type InputAreaOfInput = { whole: boolean; screen: Size; rects: Rect[] };

export type { InputArea };
