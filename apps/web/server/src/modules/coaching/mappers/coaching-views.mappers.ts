import { isIncludedIn } from 'remeda';

import type { CoachingOffer } from '../../../../generated';
import type { CoachContacts, CoachingOrderView, CoachOfferView, CoachView, OrderViewInput } from '../coaching.types';
import type { CoachViewInput } from './coaching-views.types';

import { toIso } from '../../../common/lib';
import { toAuthorView } from '../../community-core';
import { COACHING } from '../config/coaching.constants';
import { coachContactsSchema } from '../dto/coaching.schemas';

export const contactsOf = (value: unknown): CoachContacts => {
  const parsed = coachContactsSchema.safeParse(value ?? {});

  return parsed.success ? parsed.data : {};
};

export const toOfferView = (offer: CoachingOffer): CoachOfferView => ({
  id: offer.id,
  title: offer.title,
  description: offer.description,
  durationMinutes: offer.durationMinutes,
  withReplay: offer.withReplay,
  isActive: offer.isActive
});

export const toCoachView = ({ coach, stats }: CoachViewInput): CoachView => ({
  userId: coach.userId,
  name: coach.user.name,
  image: toAuthorView(coach.user).image,
  accountId: Number(coach.accountId),
  headline: coach.headline,
  bio: coach.bio,
  contacts: contactsOf(coach.contacts),
  tankIds: coach.tankIds,
  isActive: coach.isActive,
  rating: coach.rating,
  ordersDone: coach.ordersDone,
  stats: stats.get(coach.accountId) ?? null,
  offers: coach.offers.map(toOfferView)
});

export const toOrderView = ({ order, viewerId }: OrderViewInput): CoachingOrderView => {
  const showsContact = order.studentUserId === viewerId || isIncludedIn(order.status, COACHING.contactVisibleStatuses);

  return {
    id: order.id,
    coachUserId: order.coachUserId,
    studentUserId: order.studentUserId,
    offerId: order.offerId,
    replayId: order.replayId,
    status: order.status,
    notes: order.notes,
    studentContact: showsContact ? order.studentContact : null,
    review: order.review,
    score: order.score,
    createdAt: order.createdAt.toISOString(),
    completedAt: toIso(order.completedAt)
  };
};
