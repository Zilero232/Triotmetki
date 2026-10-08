import type { PlusStateKind } from '@otmetki/schemas';

export type CheckoutNoteInput = {
  isSignedIn: boolean;
  isPlus: boolean;
  state: PlusStateKind;
  periodEnd: string | null;
  isCheckoutAvailable: boolean;
};

export type CheckoutNote =
  | { kind: 'state'; state: 'active' | 'grace' | 'trial'; periodEnd: string | null }
  | { kind: 'text'; key: 'closedNote' | 'guestNote' | 'note' | 'notePlus' };

export type CheckoutModeInput = {
  isPending: boolean;
  isError: boolean;
  isSignedIn: boolean;
  isPlus: boolean;
  isCheckoutAvailable: boolean;
  trialAvailable: boolean;
};

export type CheckoutMode = 'buy' | 'error' | 'guest' | 'pending' | 'plus' | 'promo' | 'trial';
