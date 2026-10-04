import type { EditorSchematic, EditorSchematicInput, EditorScreen, EditorScreensInput } from './editor-screens.types';

import { cameraSchematic, minimapSchematic } from '../schematic';

export const editorScreens = ({ preview, editor, previewLabel }: EditorScreensInput): EditorScreen[] => {
  const panel: EditorScreen[] = preview
    ? [{ id: 'panel', label: previewLabel, widget: preview.widget ?? null, text: preview.text ?? preview.preview, captioned: false }]
    : [];

  const samples = (editor.samples ?? []).map(({ id, label, widget }) => ({ id, label, widget, text: null, captioned: true }));

  return [...panel, ...samples];
};

export const editorSchematic = ({ editor, fields }: EditorSchematicInput): EditorSchematic | null => {
  if (editor.schematic === 'minimap') {
    return { kind: 'minimap', minimap: minimapSchematic({ fields }) };
  }

  if (editor.schematic === 'camera') {
    return { kind: 'camera', camera: cameraSchematic({ fields }) };
  }

  return null;
};
