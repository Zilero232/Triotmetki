import type { ReactNode } from 'react';

import type { HudTone } from '../tone';

export type RadialTimerProps = { progress: number; size: number; stroke: number; tone?: HudTone; children?: ReactNode };
