import type { UiState } from '@/shared/api/protocol';

import { fontSafeWalker } from '@/shared/lib/font-safe';
import { isRecord } from '@/shared/lib/is-record';

import { FONT_SAFE_STATE } from '../../config';

const safeValue = fontSafeWalker(FONT_SAFE_STATE.keptKeys);

export const fontSafeState = (state: UiState): UiState => {
  const safe = safeValue(state);

  return isRecord(safe) ? { ...state, ...safe } : state;
};
