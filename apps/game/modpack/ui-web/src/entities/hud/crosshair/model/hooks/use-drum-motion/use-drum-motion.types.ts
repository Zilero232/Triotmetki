import type { ShellMotion } from '../../../lib/drum-view';

export type DrumMotion = (index: number) => ShellMotion | null;

export type DrumReading = { loaded: number; size: number };

export type DrumMotionInput = DrumReading;
