'use client';

import { useFormatter } from 'next-intl';

import { useClientNow } from '@/shared/lib';

import type { UseChallengeCardInput } from './use-challenge-card.types';

import { CHALLENGE_CARD } from '../../../config';

export const useChallengeCard = ({ amount, currency, expiresAt }: UseChallengeCardInput) => {
  const format = useFormatter();
  const now = useClientNow({ updateInterval: CHALLENGE_CARD.nowRefreshMs });

  return {
    amountLabel: format.number(amount, { style: 'currency', currency, maximumFractionDigits: 0 }),
    expiresLabel: expiresAt && now ? format.relativeTime(new Date(expiresAt), now) : null
  };
};
