import type { UiFeed, UiFeedItem } from '@/shared/api/protocol';

export type FeedState = {
  component: string;
  rev: number;
  page: Record<string, unknown> | null;
  items: UiFeedItem[];
};

export type PatchItemsInput = {
  items: UiFeedItem[];
  set: UiFeedItem[];
  removed: string[];
};

export type ApplyFeedInput = {
  held: FeedState | null;
  message: UiFeed;
};

export type PatchFeedInput = {
  held: FeedState;
  message: UiFeed;
};
