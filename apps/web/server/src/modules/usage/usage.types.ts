import type { UsageAudience, UsageMeterKey } from '@otmetki/schemas';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';

import type { MeterScope } from './lib/meter-scopes/meter-scopes.types';
import type { UsagePeriod } from './lib/usage-period/usage-period.types';

export type UsageActor = {
  userId: string | null;
  deviceId: string | null;
  ipHash: string | null;
};

export type UsageRequest = {
  session?: UserSession | null;
  usageActor?: UsageActor;
};

export type ConsumeUsageInput = {
  meter: UsageMeterKey;
  actor: UsageActor;
  subject: string;
};

export type MeterReadInput = {
  meter: UsageMeterKey;
  audience: UsageAudience;
  actor: UsageActor;
  period: UsagePeriod;
};

export type IncrementInput = {
  meter: UsageMeterKey;
  period: UsagePeriod;
  scopes: MeterScope[];
};

export type RollbackInput = IncrementInput & {
  seen: string;
};

export type ExhaustedInput = {
  meter: UsageMeterKey;
  limit: number;
};

export type DeviceOfInput = {
  request: Request;
  response: Response;
  secret: string;
};
