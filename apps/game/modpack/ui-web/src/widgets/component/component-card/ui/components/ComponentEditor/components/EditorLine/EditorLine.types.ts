import type { Ref } from 'react';

import type { SettingInput } from '@/entities/window/window-state';

import type { EditorRow } from '../../../../../lib/editor-layout';
import type { EditorHint } from '../../../../../model/hooks';

export type EditorLineProps = {
  row: EditorRow;
  focused?: boolean;
  lineRef?: Ref<HTMLDivElement>;
  onSet: (input: SettingInput) => void;
  onHint: (hint: EditorHint) => void;
};
