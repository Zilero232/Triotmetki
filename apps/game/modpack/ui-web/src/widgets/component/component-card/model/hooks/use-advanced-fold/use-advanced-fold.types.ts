import type { EditorGroup } from '../../../lib/editor-layout';

export type UseAdvancedFoldInput = {
  groups: EditorGroup[];
  isListPage: boolean;
  focusKey: string | null;
};
