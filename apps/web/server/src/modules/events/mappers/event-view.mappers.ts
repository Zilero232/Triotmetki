import type { GameEvent as GameEventView } from '@otmetki/schemas';

import type { GameEvent } from '../../../../generated';

import { toIso } from '../../../common/lib';
import { httpUrl } from '../../../lib/scrape';
import { EVENT_KIND_FROM_DB } from '../lib/event-kind/event-kind.constants';

export const toEventView = (event: GameEvent): GameEventView => ({
  id: event.id,
  slug: event.slug,
  kind: EVENT_KIND_FROM_DB[event.kind],
  title: event.title,
  description: event.description,
  url: httpUrl(event.url),
  image: httpUrl(event.image),
  startsAt: event.startsAt.toISOString(),
  endsAt: toIso(event.endsAt)
});
