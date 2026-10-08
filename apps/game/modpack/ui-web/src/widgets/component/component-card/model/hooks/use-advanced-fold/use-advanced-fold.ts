import { useBoolean } from '@siberiacancode/reactuse';

import type { UseAdvancedFoldInput } from './use-advanced-fold.types';

import { foldAdvanced } from '../../../lib/editor-layout';

export const useAdvancedFold = ({ groups, isListPage, focusKey }: UseAdvancedFoldInput) => {
  const { side, folded } = foldAdvanced({ groups, isListPage });
  const isFocusFolded = folded?.rows.some(({ field }) => field.key === focusKey) ?? false;
  const [isOpen, toggle] = useBoolean(isFocusFolded);

  return { side, folded, isOpen, toggle: () => toggle() };
};
