import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ReplayItem, ReplaysPage } from '../../model/schemas';

import { replaysPageSchema } from '../../model/schemas';

const PAGE_SAMPLE_PATH = path.resolve(import.meta.dirname, 'replays-page.sample.json');

export const rawPageSample = (): unknown => JSON.parse(readFileSync(PAGE_SAMPLE_PATH, 'utf8'));

export const pageSample = (): ReplaysPage => replaysPageSchema.parse(rawPageSample());

export const replayItem = (values: Partial<ReplayItem>): ReplayItem => {
  const [first] = pageSample().items;

  if (!first) {
    throw new Error('the page sample has no items');
  }

  return { ...first, ...values };
};
