export const STREAMER_SETTINGS = {
  provenanceKeys: new Set(['source', 'sourceUrl', 'checkedAt']),
  groups: ['display', 'camera', 'controls', 'zoom', 'sight', 'markers', 'minimap', 'sound', 'battleUi', 'hardware', 'mods'],
  sources: ['creator', 'editorial', 'mod', 'preferences'],
  windowModes: ['fullscreen', 'borderless', 'windowed'],
  clients: ['sd', 'hd'],
  presets: ['minimum', 'low', 'medium', 'high', 'maximum', 'ultra', 'custom'],
  graphicsOptions: [
    'effects',
    'vegetation',
    'shadows',
    'terrain',
    'water',
    'lighting',
    'textures',
    'motionBlur',
    'tessellation',
    'antialiasing',
    'decals',
    'postProcessing'
  ],
  zoomSteps: ['x2', 'x4', 'x8', 'x16', 'x25'],
  gunMarkers: ['server', 'client'],
  markerTargets: ['enemy', 'ally', 'destroyed'],
  maxNotableBinds: 32,
  markerFields: ['icon', 'tier', 'vehicleName', 'playerName', 'hpBar', 'hpValue', 'damage'],
  modsKinds: ['clean', 'modpack', 'custom'],
  applyStatuses: ['pending', 'applied', 'rejected', 'expired'],
  applyTargets: ['profile', 'private'],
  cohorts: ['creators', 'top', 'all'],
  minCohort: 20,
  compareMax: 4,
  compareMin: 2,
  sensitivity: { min: 0.01, max: 3 },
  fov: { min: 70, max: 120 },
  textMax: 120,
  bindsMax: 20
} as const;

export const STREAMER_SETTINGS_HARDWARE_SPECIFIC = {
  display: ['resolution', 'refreshRate', 'windowMode'],
  controls: ['sensitivity']
} as const;

export const STREAMER_SETTINGS_APPLICABLE = ['display', 'camera', 'controls', 'zoom', 'sight', 'markers', 'minimap', 'sound', 'battleUi'] as const;

export const STREAMER_SETTINGS_AGGREGATE_FIELDS = [
  { field: 'controls.sensitivity.sniper', kind: 'numeric', step: 0.05 },
  { field: 'controls.sensitivity.arcade', kind: 'numeric', step: 0.05 },
  { field: 'camera.fov', kind: 'numeric', step: 5 },
  { field: 'display.preset', kind: 'categorical' },
  { field: 'display.client', kind: 'categorical' },
  { field: 'display.resolution', kind: 'categorical' },
  { field: 'zoom.max', kind: 'categorical' },
  { field: 'sight.sniper.gunMarker', kind: 'categorical' },
  { field: 'mods.kind', kind: 'categorical' }
] as const;
