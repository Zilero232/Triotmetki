import { map } from 'nanostores';

import { send } from '@/shared/api/protocol';

import type { RememberScrollInput, ScrollTops } from './scroll.types';

export const $scroll = map<ScrollTops>({});

export const seedScroll = (tops: ScrollTops): void => {
  $scroll.set(tops);
};

export const rememberScroll = ({ page, top }: RememberScrollInput): void => {
  const rounded = Math.round(top);

  if ($scroll.get()[page] === rounded) {
    return;
  }

  $scroll.setKey(page, rounded);
  send({ type: 'scroll', page, top: rounded });
};
