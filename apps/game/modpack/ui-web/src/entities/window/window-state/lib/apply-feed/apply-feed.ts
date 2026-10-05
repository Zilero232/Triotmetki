import type { UiFeed, UiFeedItem } from '@/shared/api/protocol';

import type { ApplyFeedInput, FeedState, PatchFeedInput, PatchItemsInput } from './apply-feed.types';

const patchItems = ({ items, set, removed }: PatchItemsInput): UiFeedItem[] => {
  const gone = new Set(removed);
  const changed = new Map(set.map((item) => [item.id, item]));
  const kept = items.filter((item) => !gone.has(item.id)).map((item) => changed.get(item.id) ?? item);
  const known = new Set(kept.map((item) => item.id));

  return [...kept, ...set.filter((item) => !known.has(item.id))];
};

const snapshotOf = (message: UiFeed): FeedState => ({
  component: message.feed,
  rev: message.rev,
  page: message.page,
  items: message.items ?? []
});

const patchedFeed = ({ held, message }: PatchFeedInput): FeedState => ({
  ...held,
  rev: message.rev,
  page: message.page,
  items: patchItems({ items: held.items, set: message.set ?? [], removed: message.del ?? [] })
});

export const applyFeed = ({ held, message }: ApplyFeedInput): FeedState | null => {
  const current = held?.component === message.feed ? held : null;

  if (current?.rev === message.rev) {
    return current;
  }

  if (message.base === null) {
    return snapshotOf(message);
  }

  if (current?.rev !== message.base) {
    return null;
  }

  return patchedFeed({ held: current, message });
};
