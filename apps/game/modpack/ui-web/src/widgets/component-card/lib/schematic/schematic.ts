import type { UiField } from '../../../../shared/api/protocol';
import type { CameraSchematicModel, MinimapNames, MinimapSchematicModel, SchematicFieldsInput, SchematicState } from './schematic.types';

import { SCHEMATIC } from '../../config';

type FieldValueInput = { fields: UiField[]; key: string };

const valueOf = ({ fields, key }: FieldValueInput): string | null => {
  const field = fields.find((item) => item.key === key);

  return field ? String(field.value) : null;
};

const choiceLabel = ({ fields, key }: FieldValueInput): string | null => {
  const field = fields.find((item) => item.key === key);

  if (!field || field.type !== 'choice') {
    return null;
  }

  return field.choices.find(({ value }) => value === field.value)?.label ?? null;
};

const stateOf = (value: string | null): SchematicState => {
  if (value === SCHEMATIC.on) {
    return 'on';
  }

  return value === null || value === SCHEMATIC.native ? 'native' : 'off';
};

const sizeScale = (value: string | null): number => {
  const step = SCHEMATIC.minimap.sizes.findIndex((size) => size === value);

  return step < 0 ? SCHEMATIC.minimap.nativeScale : SCHEMATIC.minimap.smallest + step * SCHEMATIC.minimap.sizeStep;
};

const opacityOf = (value: string | null): number => {
  const percent = Number(value);

  return value === null || value === SCHEMATIC.native || !Number.isFinite(percent) ? 1 : 1 - percent / 100;
};

const namesOf = (value: string | null): MinimapNames => {
  const names: Record<string, MinimapNames> = SCHEMATIC.minimap.names;

  return (value !== null && names[value]) || 'native';
};

export const minimapSchematic = ({ fields }: SchematicFieldsInput): MinimapSchematicModel => ({
  scale: sizeScale(valueOf({ fields, key: 'size' })),
  opacity: opacityOf(valueOf({ fields, key: 'transparency' })),
  names: namesOf(valueOf({ fields, key: 'vehicle_names' })),
  viewRange: stateOf(valueOf({ fields, key: 'view_range' })),
  maxViewRange: stateOf(valueOf({ fields, key: 'max_view_range' })),
  drawRange: stateOf(valueOf({ fields, key: 'draw_range' }))
});

export const cameraSchematic = ({ fields }: SchematicFieldsInput): CameraSchematicModel => ({
  preset: choiceLabel({ fields, key: 'preset' }),
  zoom: choiceLabel({ fields, key: 'sniper_zoom' }),
  stabilization: stateOf(valueOf({ fields, key: 'horizontal_stabilization' })),
  shake: stateOf(valueOf({ fields, key: 'dynamic_camera' }))
});
