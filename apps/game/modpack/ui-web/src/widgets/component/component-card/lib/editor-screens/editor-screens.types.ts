import type { UiEditor, UiField } from '@/shared/api/protocol';

import type { PreviewPanel } from '../card-layout/card-layout.types';
import type { CameraSchematicModel, MinimapSchematicModel } from '../schematic';

export type EditorScreen = {
  id: string;
  label: string;
  widget: PreviewPanel['widget'];
  text: string | null;
  captioned: boolean;
};

export type EditorScreensInput = {
  preview: PreviewPanel | null;
  editor: UiEditor;
  previewLabel: string;
};

export type EditorSchematic = { kind: 'camera'; camera: CameraSchematicModel } | { kind: 'minimap'; minimap: MinimapSchematicModel };

export type EditorSchematicInput = {
  editor: UiEditor;
  fields: UiField[];
};
