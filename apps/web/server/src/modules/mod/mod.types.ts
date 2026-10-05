import type { RawBodyRequest } from '@nestjs/common';
import type { BindCode, BindCodeInput as BindCodeBody, ModDeviceRequest, ModDevice as ModDeviceView } from '@otmetki/schemas';
import type { Request } from 'express';
import type { z, ZodType } from 'zod';

import type { ModDevice, Player, UserLestaAccount } from '../../../generated';
import type { bindRequestSchema } from './lib/contract/contract.schemas';
import type { BattleResultEvent, IngestBatch, IngestEvent, IngestResponse } from './lib/contract/contract.types';

export type LedgerKeyInput = {
  accountId: bigint;
  eventId: string;
};

export type AuthenticatedDevice = ModDevice & {
  accountId: bigint;
};

export type IngestInput = {
  device: AuthenticatedDevice;
  batch: IngestBatch;
};

export type IdentifyDeviceInput = {
  deviceId: string | undefined;
  signature: string | undefined;
};

export type SignedModRequest = {
  method: string;
  originalUrl: string;
  header: (name: string) => string | undefined;
};

export type AuthenticateInput = {
  request: SignedModRequest;
  rawBody: Buffer | undefined;
  signedHeaders?: readonly string[];
};

export type BindInput = {
  body: unknown;
  requester: string;
};

export type BindLinkInput = {
  userId: string;
  accountId: bigint | null;
};

export type BindRequest = z.infer<typeof bindRequestSchema>;

export type ClaimCodeInput = {
  request: BindRequest;
  failureKey: string;
};

export type ClaimedCode = {
  userId: string;
  link: UserLestaAccount & { player: Player };
};

export type RegisterDeviceInput = {
  request: BindRequest;
  userId: string;
  accountId: bigint;
  deviceId: string;
  secret: string;
};

export type BindCodeInput = BindCodeBody & {
  userId: string;
};

export type { BindCode, ModDeviceView };

export type RevokeDeviceInput = {
  userId: string;
  deviceId: string;
};

export type SessionSummary = NonNullable<IngestResponse['session']>;

export type BattleEventInput = {
  device: AuthenticatedDevice;
  event: BattleResultEvent;
};

export type LedgeredEventInput = {
  device: AuthenticatedDevice;
  event: Exclude<IngestEvent, BattleResultEvent>;
};

export type SessionRef = {
  id: string;
  modId: string;
};

export type MarkGainedInput = {
  accountId: bigint;
  tankId: number;
  marks: number;
  previous: number | null;
  percent: number;
};

export type SignedDeviceBody = Pick<ModDeviceRequest, 'account_id'> & {
  device_id: string;
};

export type AuthenticateBodyInput<T> = {
  request: RawBodyRequest<Request>;
  schema: ZodType<T>;
};

export type AuthenticatedBody<T> = {
  device: AuthenticatedDevice;
  body: T;
};

export type { ModOverview, ModTankRatings } from '@otmetki/schemas';

export type TankRatingsInput = {
  accountId: bigint;
  tankIds: number[];
};

export type BattleStartedEvent = {
  accountId: bigint;
  tankId: number | null;
  occurredAt: Date;
};

export type BattleEventsSink = {
  started: (event: BattleStartedEvent) => Promise<void>;
};
