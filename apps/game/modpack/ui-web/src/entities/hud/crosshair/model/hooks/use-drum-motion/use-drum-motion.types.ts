import type { ShellMotion } from '../../../lib/drum-view';

export type DrumMotion = (index: number) => ShellMotion | null;
