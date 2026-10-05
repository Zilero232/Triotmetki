import { describe, expect, it } from 'vitest';

import { EVENT_CALENDAR, EVENT_KIND_RULES } from '../../../config/calendar.constants';
import { eventKind, eventSlug } from '../event-kind';

describe('eventKind', () => {
  it('classifies the saved game-events headlines', () => {
    expect(eventKind('Натиск: Огненный сокол')).toBe('onslaught');
    expect(eventKind('Боевые задачи и тематическая кастомизация')).toBe(EVENT_CALENDAR.defaultKind);
  });

  it('treats streaming platforms as drops before any other rule', () => {
    expect(eventKind('Twitch Drops: скидки на премиум танки')).toBe('drops');
    expect(EVENT_KIND_RULES[0].kind).toBe('drops');
  });

  it('recognises seasonal modes', () => {
    expect(eventKind('Новый Боевой пропуск')).toBe('battlePass');
    expect(eventKind('Линия фронта возвращается')).toBe('frontLine');
  });
});

describe('eventSlug', () => {
  it('uses the last path segment', () => {
    expect(eventSlug('https://tanki.su/ru/news/game-events/Onslaught_Falcon/')).toBe('onslaught-falcon');
  });
});
