import type { MatchDonationInput, OpenChallenge } from './donation-match.types';

import { extractChallengeCodes } from '../challenge-code';

export const matchDonation = <T extends OpenChallenge>({ message, amount, currency, challenges }: MatchDonationInput<T>): T | null => {
  const codes = extractChallengeCodes(message);

  if (codes.length === 0) {
    return null;
  }

  return (
    challenges.find(
      (challenge) => codes.includes(challenge.code) && challenge.currency.toUpperCase() === currency.toUpperCase() && amount >= challenge.amount
    ) ?? null
  );
};
