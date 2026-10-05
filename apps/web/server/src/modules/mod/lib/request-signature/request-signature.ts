import type { FreshTimestampInput, SignedMessageInput } from './request-signature.types';

import { MOD_REQUEST } from '../../config/device.constants';
import { REQUEST_SIGNATURE } from './request-signature.constants';

export const signedMessage = ({ method, path, timestamp, nonce, headers = [], body }: SignedMessageInput): Buffer => {
  const lines = [
    MOD_REQUEST.version,
    method.toUpperCase(),
    path,
    timestamp,
    nonce,
    ...headers.map(({ name, value }) => `${name.toLowerCase()}:${value}`)
  ];

  return Buffer.concat([Buffer.from(`${lines.join('\n')}\n`), body]);
};

export const isFreshTimestamp = ({ timestamp, now }: FreshTimestampInput): boolean =>
  timestamp !== undefined &&
  REQUEST_SIGNATURE.timestampShape.test(timestamp) &&
  Math.abs(Number(timestamp) - now.getTime() / 1000) <= MOD_REQUEST.maxSkewSeconds;

export const isNonce = (nonce: string | undefined): nonce is string => nonce !== undefined && MOD_REQUEST.noncePattern.test(nonce);

export const requestPath = (url: string): string => url.split('?')[0] ?? '';
