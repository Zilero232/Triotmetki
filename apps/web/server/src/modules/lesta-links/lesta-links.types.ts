import type { GarageScope } from './config/lesta-links-queue.types';

export type GarageDispatchInput = {
  scope: GarageScope;
  now?: Date;
};

export type GarageSyncInput = {
  accountId: number;
  now?: Date;
};

export type GarageSyncResult =
  | { status: 'rejected' | 'skipped' | 'unknown' }
  | {
      status: 'synced';
      inGarage: number;
      sold: number;
    };

export type TokenRenewalResult = {
  due: number;
  renewed: number;
  stale: number;
  failed: number;
};

type StaleLink = {
  userId: string;
  accountId: bigint;
  tokenExpiresAt: Date | null;
  player: { nickname: string };
};

export type MarkStaleInput = {
  link: StaleLink;
  now: Date;
};
