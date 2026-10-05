import { atom } from 'nanostores';

import { parseFeed, send } from '@/shared/api/protocol';

import type { FeedState } from '../../lib/apply-feed';

import { applyFeed } from '../../lib/apply-feed';

export const $feed = atom<FeedState | null>(null);
const $watchedFeed = atom<string | null>(null);

let resyncing = false;

const ask = (component: string): void => {
  resyncing = true;
  send({ type: 'feed', component, active: true });
};

export const watchFeed = (component: string): void => {
  $watchedFeed.set(component);
  $feed.set(null);
  ask(component);
};

export const unwatchFeed = (component: string): void => {
  if ($watchedFeed.get() !== component) {
    return;
  }

  $watchedFeed.set(null);
  $feed.set(null);
  resyncing = false;
  send({ type: 'feed', component, active: false });
};

export const receiveFeed = (raw: string | null): boolean => {
  const message = raw ? parseFeed(raw) : null;

  if (message === null || message.feed !== $watchedFeed.get()) {
    return false;
  }

  const next = applyFeed({ held: $feed.get(), message });

  if (next === null) {
    if (!resyncing) {
      ask(message.feed);
    }

    return false;
  }

  if (message.base === null) {
    resyncing = false;
  }

  $feed.set(next);

  return true;
};
