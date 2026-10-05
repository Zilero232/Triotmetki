import type { Subscription } from '../../../../../generated';

export type AccessEndInput = Pick<Subscription, 'currentPeriodEnd' | 'status'>;

export type IsEntitledInput = {
  subscription: AccessEndInput | null;
  now: Date;
};
