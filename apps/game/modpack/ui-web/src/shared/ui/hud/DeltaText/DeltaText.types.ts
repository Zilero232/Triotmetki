import type { HudTone } from '../tone';

export type DeltaDirection = 'down' | 'flat' | 'up';

export type DeltaTextProps = { text: string; direction: DeltaDirection; tone?: HudTone; className?: string };
