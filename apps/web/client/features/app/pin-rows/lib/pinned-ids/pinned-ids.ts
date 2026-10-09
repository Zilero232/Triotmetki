import { unique } from 'remeda';
import * as z from 'zod';

import type { TogglePinnedIdInput } from './pinned-ids.types';

const pinnedIdsSchema = z.array(z.string()).catch([]);

export const readPinnedIds = (value: unknown): string[] => unique(pinnedIdsSchema.parse(value));

export const togglePinnedId = ({ ids, id, limit }: TogglePinnedIdInput): string[] =>
  ids.includes(id) ? ids.filter((pinned) => pinned !== id) : [id, ...ids].slice(0, limit);
