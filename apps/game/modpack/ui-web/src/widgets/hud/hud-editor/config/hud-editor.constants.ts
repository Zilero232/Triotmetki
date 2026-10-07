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
  stage: { width: 768, minWidth: 320, measureFrames: 6 },
  fit: {
    bare: { width: 14, height: 12 },
    label: { width: 72, height: 16 }
  },
  layer: { selected: 100, hovered: 200 },
  iconSize: 12
} as const;

export const STAGE_STOCK = [
  { id: 'ears-left', kind: 'plate', box: { left: '0%', top: '3.7%', width: '11.5%', height: '33.3%' } },
  { id: 'ears-right', kind: 'plate', box: { left: '88.5%', top: '3.7%', width: '11.5%', height: '33.3%' } },
  { id: 'damage-panel', kind: 'plate', box: { left: '0%', top: '82.4%', width: '12%', height: '17.6%' } },
  { id: 'consumables', kind: 'plate', box: { left: '37.76%', top: '94.8%', width: '24.48%', height: '4.8%' } },
  { id: 'minimap', kind: 'minimap', box: { left: '87%', top: '76.85%', width: '13%', height: '23.15%' } }
] as const;
