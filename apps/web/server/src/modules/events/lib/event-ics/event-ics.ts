import type { GameEvent } from '@otmetki/schemas';
import type { EventAttributes } from 'ics';

import { createEvents } from 'ics';

import type { EventsIcsInput } from './event-ics.types';

import { EVENT_ICS } from '../../config/ics.constants';
import { foldIcsOctets } from '../ics-fold/ics-fold';

const toIcsEvent = (event: GameEvent): EventAttributes => {
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : null;
  const base = {
    uid: `${event.slug}${EVENT_ICS.uidSuffix}`,
    title: event.title,
    start,
    startInputType: EVENT_ICS.timeType,
    startOutputType: EVENT_ICS.timeType,
    categories: [event.kind],
    ...(event.description ? { description: event.description } : {}),
    ...(event.url ? { url: event.url } : {})
  };

  return end !== null && end > start
    ? { ...base, end, endInputType: EVENT_ICS.timeType, endOutputType: EVENT_ICS.timeType }
    : { ...base, duration: { ...EVENT_ICS.defaultDuration } };
};

export const eventsIcs = ({ events, calName }: EventsIcsInput): string => {
  const { error, value } = createEvents(events.map(toIcsEvent), { productId: EVENT_ICS.productId, calName });

  if (error || value === null) {
    throw error ?? new Error('The iCal feed could not be built');
  }

  return foldIcsOctets(value);
};
