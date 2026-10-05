import type { PlusState, PlusStateKind } from '@otmetki/schemas';

import type { PlusStateInput } from './plus-state.types';

import { toIso } from '../../../../common/lib';
import { accessEndsAt, isEntitled } from '../entitlement/entitlement';

const stateKindOf = ({ subscription, now }: Pick<PlusStateInput, 'now' | 'subscription'>): PlusStateKind => {
  if (!subscription) {
    return 'none';
  }

  if (!isEntitled({ subscription, now })) {
    return 'expired';
  }

  if (subscription.status === 'trialing') {
    return 'trial';
  }

  return subscription.status === 'pastDue' ? 'grace' : 'active';
};

export const plusStateOf = ({ subscription, now, trialAvailable, trialDays }: PlusStateInput): PlusState => {
  const state = stateKindOf({ subscription, now });

  return {
    state,
    periodEnd: toIso(subscription?.currentPeriodEnd),
    graceEndsAt: state === 'grace' && subscription ? toIso(accessEndsAt(subscription)) : null,
    trialAvailable: trialAvailable && state !== 'trial' && state !== 'active' && state !== 'grace',
    trialDays
  };
};
