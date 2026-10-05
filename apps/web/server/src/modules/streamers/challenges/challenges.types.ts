import type { DonationAlertsDonationEvent, EventsListener } from '@donation-alerts/events';
import type { CreateChallengeInput, streamerChallengeSchema } from '@otmetki/schemas';
import type { z } from 'zod';

import type { Challenge, StreamerProvider } from '../../../../generated';
import type { ChallengeVerdict } from './lib/challenge-evaluator/challenge-evaluator.types';

export type StreamerChallengeView = z.infer<typeof streamerChallengeSchema>;

export type OwnedInput = {
  userId: string;
  id: string;
};

export type CreateStreamerChallengeInput = CreateChallengeInput & {
  userId: string;
};

export type ActivateChallengeInput = {
  challengeId: string;
  donorName: string | null;
  donorMessage: string | null;
  source: StreamerProvider | null;
  externalId: string | null;
  now: Date;
};

export type ActivateByStreamerInput = OwnedInput & {
  donorName: string | null;
};

export type DonationInput = {
  streamerUserId: string;
  externalId: string;
  donorName: string;
  message: string;
  amount: number;
  currency: string;
};

export type ResolveChallengeInput = {
  challenge: Challenge;
  verdict: ChallengeVerdict;
  now: Date;
};

export type EvaluateInput = {
  challenge: Challenge;
  now: Date;
};

export type ProcessBatchInput = {
  accountIds: bigint[];
  now: Date;
};

export type DonationConnection = {
  userId: string;
  listener: EventsListener;
};

export type DonationEventInput = {
  streamerUserId: string;
  donation: DonationAlertsDonationEvent;
};
