import { addDays, getUnixTime } from 'date-fns';

import type { RelinkKeyInput, RenewalDueInput } from './token-renewal.types';

import { LESTA_ERROR_CODE, LestaApiError } from '../../../../lib/lesta';
import { LESTA_LINKS } from '../../config/lesta-links.constants';

export const renewalDue = ({ expiresAt, now }: RenewalDueInput): boolean =>
  expiresAt !== null && expiresAt.getTime() <= addDays(now, LESTA_LINKS.token.renewWithinDays).getTime();

export const hasExpired = ({ expiresAt, now }: RenewalDueInput): boolean => expiresAt !== null && expiresAt.getTime() <= now.getTime();

export const renewedExpiry = (now: Date): number => getUnixTime(addDays(now, LESTA_LINKS.token.extendDays));

export const isTokenRejected = (error: unknown): boolean => error instanceof LestaApiError && error.code === LESTA_ERROR_CODE.invalidAccessToken;

export const relinkDedupeKey = ({ accountId, expiresAt }: RelinkKeyInput): string =>
  `lesta-relink-${accountId}-${expiresAt ? expiresAt.toISOString().slice(0, 10) : 'none'}`;
