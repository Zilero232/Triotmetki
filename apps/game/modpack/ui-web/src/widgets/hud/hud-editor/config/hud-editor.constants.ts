import type { NudgeSteps } from '@/entities/hud/panel-layout';

const NUDGE: NudgeSteps = {
  ArrowLeft: { dx: -4, dy: 0 },
  ArrowRight: { dx: 4, dy: 0 },
  ArrowUp: { dx: 0, dy: -4 },
  ArrowDown: { dx: 0, dy: 4 }
};

export const HUD_EDITOR = {
  grid: 4,
  defaultScreen: { width: 1920, height: 1080 },
  dragSlop: 5,
  nudge: NUDGE,
  resetActionId: 'reset',
  resetAllActionId: 'reset-all'
} as const;
