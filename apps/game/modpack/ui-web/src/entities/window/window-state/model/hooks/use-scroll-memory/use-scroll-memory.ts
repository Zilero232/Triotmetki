import { useState } from 'react';

import type { Section } from '../../store';

import { $scroll, rememberScroll } from '../../scroll';

export const useScrollMemory = (page: Section) => {
  const [initialTop] = useState(() => $scroll.get()[page] ?? 0);

  return {
    initialTop,
    onScrollEnd: (top: number) => rememberScroll({ page, top })
  };
};
