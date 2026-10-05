import { createHash, createHmac, randomBytes } from 'node:crypto';

import type { DeviceSecretInput, MatchesSecretHashInput } from './device-secret.types';

import { timingSafeEqual } from '../../../../common/lib';
import { MOD_DEVICE } from '../../config/device.constants';

export const deviceSecret = ({ deviceId, serverSecret }: DeviceSecretInput): string =>
  createHmac('sha256', serverSecret).update(`${MOD_DEVICE.secretContext}${deviceId}`).digest('base64url');

export const hashSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');

export const matchesSecretHash = ({ secret, hash }: MatchesSecretHashInput): boolean => timingSafeEqual({ left: hashSecret(secret), right: hash });

export const newDeviceId = (): string => `${MOD_DEVICE.idPrefix}${randomBytes(MOD_DEVICE.idBytes).toString('base64url')}`;

export const normalizeBindCode = (code: string): string => code.replace(/[\s-]/g, '').toUpperCase();
