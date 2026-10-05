import type { NavFocusIndexInput } from './nav-focus.types';

import { NAV_KEYS } from '../../config';

const nextKeys = new Set<string>(NAV_KEYS.next);
const previousKeys = new Set<string>(NAV_KEYS.previous);

export const navFocusIndex = ({ key, current, count }: NavFocusIndexInput): number | null => {
  if (nextKeys.has(key)) {
    return (current + 1) % count;
  }

  if (previousKeys.has(key)) {
    return (current - 1 + count) % count;
  }

  if (key === NAV_KEYS.first) {
    return 0;
  }

  return key === NAV_KEYS.last ? count - 1 : null;
};
