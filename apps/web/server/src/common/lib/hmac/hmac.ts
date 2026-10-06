import type { Hmac } from 'node:crypto';

import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

import type { HmacInput, MatchSignatureInput, TimingSafeEqualInput, VerifySignatureInput } from './hmac.types';

import { HMAC } from './hmac.constants';

export const timingSafeEqual = ({ left, right }: TimingSafeEqualInput): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  if (a.length !== b.length) {
    return false;
  }

  return nodeTimingSafeEqual(a, b);
};

export const sha256Hmac = (key: string | Buffer): Hmac => createHmac(HMAC.algorithm, key);

export const hmacSha256Hex = ({ key, data }: HmacInput): string => createHmac(HMAC.algorithm, key).update(data).digest('hex');

const signatureOf = (header: string | undefined): string | null => {
  if (!header?.startsWith(HMAC.headerPrefix)) {
    return null;
  }

  const received = header.slice(HMAC.headerPrefix.length).trim().toLowerCase();

  return HMAC.hexPattern.test(received) ? received : null;
};

export const isSignatureHeader = (header: string | undefined): boolean => signatureOf(header) !== null;

export const matchesSignatureHeader = ({ header, digest }: MatchSignatureInput): boolean => {
  const received = signatureOf(header);

  return received !== null && digest !== undefined && timingSafeEqual({ left: received, right: digest });
};

export const verifySignatureHeader = ({ header, key, body }: VerifySignatureInput): boolean =>
  matchesSignatureHeader({ header, digest: hmacSha256Hex({ key, data: body }) });
