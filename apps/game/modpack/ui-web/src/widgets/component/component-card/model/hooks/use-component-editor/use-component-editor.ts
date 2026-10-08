import { useStore } from '@nanostores/react';
import { useState } from 'react';

import type { UiEditor } from '@/shared/api/protocol';

import { $editorFocus, closeEditor, useT } from '@/entities/window/window-state';
import { useEscapeLayer } from '@/shared/lib/use-escape-layer';

import type { EditorBackdrop, EditorHint, UseComponentEditorInput } from './use-component-editor.types';

import { EDITOR } from '../../../config';
import { editorGroups } from '../../../lib/editor-layout';
import { editorSchematic, editorScreens } from '../../../lib/editor-screens';
import { useAdvancedFold } from '../use-advanced-fold';
import { useComponentCard } from '../use-component-card';
import { useFocusLine } from '../use-focus-line';

export const useComponentEditor = ({ component, compact }: UseComponentEditorInput) => {
  const t = useT();
  const card = useComponentCard({ component });
  const focusKey = useStore($editorFocus);
  const focus = useFocusLine(focusKey);
  const [hint, setHint] = useState<EditorHint | null>(null);
  const [zoom, setZoom] = useState<number>(EDITOR.zoomLevels[0]);
  const [backdrop, setBackdrop] = useState<EditorBackdrop>(EDITOR.backdrops[0]);

  useEscapeLayer({ kind: 'view', onEscape: closeEditor });

  const editor: UiEditor = component.editor ?? { groups: [], icons: component.gallery ?? {}, swatches: {} };
  const schematic = editorSchematic({ editor, fields: component.fields });
  const screens = editorScreens({ preview: card.preview, editor, previewLabel: t('preview') });

  const groups = editorGroups({
    fields: component.fields,
    editor,
    rowWidth: compact ? EDITOR.row.compactWidth : EDITOR.row.width,
    otherLabel: t(editor.groups.length > 0 ? 'editorOther' : 'editorSettings'),
    advancedLabel: t('advancedFields')
  });

  const fold = useAdvancedFold({ groups, isListPage: card.hasListPage, focusKey });

  return {
    card,
    screens,
    schematic,
    hasScreen: component.panel || screens.length > 0 || schematic !== null,
    caption: schematic ? EDITOR.captions.schematic : EDITOR.captions.preview,
    groups: fold.side,
    folded: fold.folded,
    isFoldOpen: fold.isOpen,
    toggleFold: fold.toggle,
    focusKey,
    focus,
    hint: hint ?? { label: component.title, text: component.hint ?? t('editorIdle') },
    zoom,
    zoomItems: EDITOR.zoomLevels.map((level) => ({ value: String(level), label: `${level}×` })),
    setZoom: (value: string) => setZoom(Number(value)),
    backdrop,
    backdropItems: EDITOR.backdrops.map((value) => ({ value, label: t(EDITOR.backdropLabels[value]) })),
    setBackdrop: (value: string) => setBackdrop(value === 'snow' ? 'snow' : 'forest'),
    showHint: (next: EditorHint) => setHint(next.text ? next : null),
    clearHint: () => setHint(null),
    close: closeEditor
  };
};
