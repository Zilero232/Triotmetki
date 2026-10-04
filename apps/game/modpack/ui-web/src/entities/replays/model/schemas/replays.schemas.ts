import * as z from 'zod/mini';

import { REPLAYS } from '../../config';

const count = z.nullable(z.number());
const text = z.nullable(z.string());

export const replayItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  size: z.number(),
  time: z.number(),
  arena: text,
  map: text,
  map_title: text,
  map_image: text,
  map_thumb: text,
  vehicle: text,
  tank: text,
  tier: count,
  cls: text,
  nation: text,
  tank_image: text,
  type: z.catch(z.enum(REPLAYS.battleTypes), 'other'),
  result: z.nullable(z.enum(REPLAYS.results)),
  damage: count,
  assist: count,
  kills: count,
  xp: count,
  base_xp: count,
  credits: count,
  spotted: count,
  marks: count,
  shots: count,
  hits: count,
  pens: count,
  received: count,
  blocked: count,
  duration: count,
  life_time: count,
  survived: z.nullable(z.boolean()),
  mastery: count,
  mastery_image: text,
  version: text,
  playable: z.boolean(),
  favourite: z.boolean(),
  site: z.nullable(z.object({ state: z.enum(REPLAYS.siteStates), link: text }))
});

export const replaysHeadSchema = z.object({
  kind: z.literal(REPLAYS.pageKind),
  status: z.enum(REPLAYS.statuses),
  progress: z.object({ done: z.number(), total: z.number() }),
  client: z.string(),
  folder: z.string(),
  upload: z.catch(z.enum(REPLAYS.uploadStates), 'missing'),
  hit_viewer: z.catch(z.array(z.string()), [])
});

export const replaysPageSchema = z.extend(replaysHeadSchema, { items: z.array(replayItemSchema) });
