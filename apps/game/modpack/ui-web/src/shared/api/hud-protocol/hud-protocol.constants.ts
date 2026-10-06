export const HUD_PROTOCOL = {
  version: 6,
  commands: ['ready', 'moved', 'resized', 'mouse', 'drawn', 'area'],
  mouseEvents: ['hover', 'down', 'wheel'],
  covers: ['', 'stats', 'modal'],
  attachKinds: ['bar_right', 'bar_above', 'minimap_above', 'score_right'],
  widgetVersion: 1,
  tones: [
    'text',
    'muted',
    'dim',
    'ally',
    'enemy',
    'gold',
    'accent',
    'radio',
    'track',
    'stun',
    'blocked',
    'received',
    'success',
    'warning',
    'good',
    'bad'
  ],
  scale: { min: 0.5, max: 3, step: 0.1 }
} as const;
