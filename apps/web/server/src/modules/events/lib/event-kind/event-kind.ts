import type { GameEventKind } from '../../../../../generated';

import { EVENT_CALENDAR, EVENT_KIND_RULES } from '../../config/calendar.constants';

export const eventKind = (title: string): GameEventKind =>
  EVENT_KIND_RULES.find((rule) => rule.pattern.test(title))?.kind ?? EVENT_CALENDAR.defaultKind;

export const eventSlug = (url: string): string =>
  new URL(url).pathname
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '') ?? '';
