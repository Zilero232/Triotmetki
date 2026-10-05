import { isRecord } from '@/shared/lib/is-record';

import type { ReplayItem, ReplaysPage } from '../../model/schemas';

import { replayItemSchema, replaysHeadSchema } from '../../model/schemas';

const parsedItems = new WeakMap<object, ReplayItem | null>();

const parseItem = (raw: unknown): ReplayItem | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const known = parsedItems.get(raw);

  if (known !== undefined) {
    return known;
  }

  const parsed = replayItemSchema.safeParse(raw);
  const item = parsed.success ? parsed.data : null;

  parsedItems.set(raw, item);

  return item;
};

export const parseReplaysPage = (page: unknown): ReplaysPage | null => {
  if (!isRecord(page) || !Array.isArray(page.items)) {
    return null;
  }

  const head = replaysHeadSchema.safeParse(page);

  if (!head.success) {
    return null;
  }

  const items: ReplayItem[] = [];

  for (const raw of page.items) {
    const item = parseItem(raw);

    if (item === null) {
      return null;
    }

    items.push(item);
  }

  return { ...head.data, items };
};
