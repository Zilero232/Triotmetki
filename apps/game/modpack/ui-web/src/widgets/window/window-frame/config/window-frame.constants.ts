export const WINDOW_FRAME = {
  defaultSize: { width: 1240, height: 800 },
  minSize: { width: 760, height: 480 },
  margin: 24,
  zoomSteps: [80, 90, 100, 110, 125, 150],
  defaultZoom: 100,
  scaleOrigin: '0 0',
  percent: 100,
  compactNavWidth: 980,
  twoColumnsWidth: 1360,
  screenCheckMs: 1000,
  defaultScreen: { width: 1920, height: 1080 }
} as const;

export const RESIZE_EDGE = {
  right: 'right',
  bottom: 'bottom',
  corner: 'corner'
} as const;

export const FRAME_GESTURE = {
  handleOrder: [RESIZE_EDGE.corner, RESIZE_EDGE.right, RESIZE_EDGE.bottom, 'move'],
  capture: { capture: true }
} as const;
