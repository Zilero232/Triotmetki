import { describe, expect, it } from 'vitest';

import type { UiField } from '@/shared/api/protocol';

import { cameraSchematic, minimapSchematic } from '../schematic';

const choice = (key: string, value: string): UiField => ({
  key,
  label: key,
  hint: null,
  type: 'choice',
  value,
  default: 'native',
  choices: [
    { value: 'native', label: 'Как в игре' },
    { value, label: `${key}:${value}` }
  ]
});

describe(minimapSchematic, () => {
  it('draws the game look for native values', () => {
    expect(minimapSchematic({ fields: [choice('size', 'native'), choice('view_range', 'native')] })).toEqual({
      scale: 0.73,
      opacity: 1,
      names: 'native',
      viewRange: 'native',
      maxViewRange: 'native',
      drawRange: 'native'
    });
  });

  it('follows the size, transparency, names and circles', () => {
    const model = minimapSchematic({
      fields: [
        choice('size', '5'),
        choice('transparency', '40'),
        choice('vehicle_names', 'alt'),
        choice('view_range', 'on'),
        choice('max_view_range', 'off'),
        choice('draw_range', 'on')
      ]
    });

    expect(model.scale).toBeCloseTo(1);
    expect(model.opacity).toBeCloseTo(0.6);
    expect([model.names, model.viewRange, model.maxViewRange, model.drawRange]).toEqual(['alt', 'on', 'off', 'on']);
  });
});

describe(cameraSchematic, () => {
  it('names the preset and the zoom by their choice labels', () => {
    const model = cameraSchematic({
      fields: [choice('preset', 'sniper'), choice('sniper_zoom', 'x4'), choice('horizontal_stabilization', 'on'), choice('dynamic_camera', 'off')]
    });

    expect(model).toEqual({ preset: 'preset:sniper', zoom: 'sniper_zoom:x4', stabilization: 'on', shake: 'off' });
  });
});
