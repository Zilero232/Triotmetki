import type { UiField } from '../../../../shared/api/protocol';

export type SchematicState = 'native' | 'off' | 'on';

export type MinimapNames = 'alt' | 'always' | 'native' | 'never';

export type MinimapSchematicModel = {
  scale: number;
  opacity: number;
  names: MinimapNames;
  viewRange: SchematicState;
  maxViewRange: SchematicState;
  drawRange: SchematicState;
};

export type CameraSchematicModel = {
  preset: string | null;
  zoom: string | null;
  stabilization: SchematicState;
  shake: SchematicState;
};

export type SchematicFieldsInput = { fields: UiField[] };
