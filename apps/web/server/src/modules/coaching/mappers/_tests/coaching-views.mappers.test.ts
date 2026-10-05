import { describe, expect, it } from 'vitest';

import type { CoachingOrder } from '../../../../../generated';

import { contactsOf, toOrderView } from '../coaching-views.mappers';

const order: CoachingOrder = {
  id: '88888888-8888-4888-8888-888888888888',
  coachUserId: 'coach',
  studentUserId: 'student',
  offerId: null,
  replayId: null,
  status: 'requested',
  priceRub: null,
  notes: null,
  studentContact: '@student',
  review: null,
  score: null,
  createdAt: new Date('2026-09-26T10:00:00Z'),
  completedAt: null
};

describe('toOrderView', () => {
  it('hides the student contact from the coach until the request is accepted', () => {
    expect(toOrderView({ order, viewerId: 'coach' }).studentContact).toBeNull();
    expect(toOrderView({ order: { ...order, status: 'accepted' }, viewerId: 'coach' }).studentContact).toBe('@student');
  });

  it('always shows the student their own contact', () => {
    expect(toOrderView({ order, viewerId: 'student' }).studentContact).toBe('@student');
  });

  it('keeps an unpriced order unpriced', () => {
    expect(toOrderView({ order, viewerId: 'student' }).priceRub).toBeNull();
  });
});

describe('contactsOf', () => {
  it('drops stored contacts that no longer parse', () => {
    expect(contactsOf({ telegram: 'not a link' })).toEqual({});
    expect(contactsOf(null)).toEqual({});
  });

  it('keeps valid links', () => {
    expect(contactsOf({ telegram: 'https://t.me/coach', discord: 'coach#1' })).toEqual({ telegram: 'https://t.me/coach', discord: 'coach#1' });
  });
});
