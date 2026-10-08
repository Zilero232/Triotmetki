import type { CheckoutMode, CheckoutModeInput, CheckoutNote, CheckoutNoteInput } from './checkout-state.types';

export const checkoutNote = ({ isSignedIn, isPlus, state, periodEnd, isCheckoutAvailable }: CheckoutNoteInput): CheckoutNote => {
  if (isPlus) {
    return state === 'trial' || state === 'grace' || state === 'active' ? { kind: 'state', state, periodEnd } : { kind: 'text', key: 'notePlus' };
  }

  if (!isSignedIn) {
    return { kind: 'text', key: 'guestNote' };
  }

  return { kind: 'text', key: isCheckoutAvailable ? 'note' : 'closedNote' };
};

export const checkoutMode = ({ isPending, isError, isSignedIn, isPlus, isCheckoutAvailable, trialAvailable }: CheckoutModeInput): CheckoutMode => {
  if (isPending) {
    return 'pending';
  }

  if (isError) {
    return 'error';
  }

  if (!isSignedIn) {
    return 'guest';
  }

  if (isPlus) {
    return 'plus';
  }

  if (isCheckoutAvailable) {
    return 'buy';
  }

  return trialAvailable ? 'trial' : 'promo';
};
