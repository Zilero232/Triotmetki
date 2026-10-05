import type { Ref } from 'react';

import type { SettingInput } from '@/entities/window/window-state';

import type { EditorGroup } from '../../../../../lib/editor-layout';
import type { EditorHint } from '../../../../../model/hooks';

export type EditorSectionProps = {
  group: EditorGroup;
  focusKey: string | null;
  lineRef: Ref<HTMLDivElement>;
  onSet: (input: SettingInput) => void;
  onHint: (hint: EditorHint) => void;
};
