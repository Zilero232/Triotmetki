export type OpenChallenge = {
  id: string;
  code: string;
  amount: number;
  currency: string;
};

export type MatchDonationInput<T extends OpenChallenge> = {
  message: string;
  amount: number;
  currency: string;
  challenges: readonly T[];
};
