import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';
import { INTERNAL_REQUEST } from '@otmetki/schemas';
import ipaddr from 'ipaddr.js';
import { createHash } from 'node:crypto';
import { isIncludedIn } from 'remeda';

import type { InternalTokenInput, ThrottleSubject, ThrottleSubjectInput, TrustedPeerInput } from './throttle-subject.types';

import { timingSafeEqual } from '../hmac/hmac';
import { THROTTLE_SUBJECT } from './throttle-subject.constants';

const digest = (value: string): string => createHash(THROTTLE_SUBJECT.digest).update(value).digest('hex');

const headerValue = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

const matchesEntry = (address: ipaddr.IPv4 | ipaddr.IPv6, entry: string): boolean => {
  if (!entry.includes(THROTTLE_SUBJECT.cidrSeparator)) {
    return ipaddr.isValid(entry) && ipaddr.process(entry).toString() === address.toString();
  }

  if (!ipaddr.isValidCIDR(entry)) {
    return false;
  }

  const [range, bits] = ipaddr.parseCIDR(entry);

  if (address instanceof ipaddr.IPv4 && range instanceof ipaddr.IPv4) {
    return address.match(range, bits);
  }

  return address instanceof ipaddr.IPv6 && range instanceof ipaddr.IPv6 && address.match(range, bits);
};

export const isTrustedPeer = ({ peer, trustedProxies }: TrustedPeerInput): boolean => {
  if (peer === undefined || !ipaddr.isValid(peer)) {
    return false;
  }

  const address = ipaddr.process(peer);

  return isIncludedIn(address.range(), THROTTLE_SUBJECT.internalPeerRanges) || trustedProxies.some((entry) => matchesEntry(address, entry));
};

export const isInternalToken = ({ received, token }: InternalTokenInput): boolean =>
  received !== undefined && received !== '' && timingSafeEqual({ left: digest(received), right: digest(token) });

export const forwardedClientIp = (value: string | string[] | undefined): string | null => {
  const first = headerValue(value)?.split(THROTTLE_SUBJECT.listSeparator)[0]?.trim();

  return first !== undefined && ipaddr.isValid(first) ? ipaddr.process(first).toString() : null;
};

export const throttleSubject = ({ request, policy }: ThrottleSubjectInput): ThrottleSubject => {
  const internal =
    isInternalToken({ received: headerValue(request.headers[INTERNAL_REQUEST.tokenHeader]), token: policy.token }) &&
    isTrustedPeer({ peer: request.socket.remoteAddress, trustedProxies: policy.trustedProxies });

  if (!internal) {
    return { tracker: normalizeIp(request.ip ?? request.socket.remoteAddress ?? '', DEFAULT_IPV6_SUBNET_PREFIX), isInternal: false };
  }

  const clientIp = forwardedClientIp(request.headers[INTERNAL_REQUEST.clientIpHeader]);

  return clientIp === null
    ? { tracker: THROTTLE_SUBJECT.internalTracker, isInternal: true }
    : { tracker: normalizeIp(clientIp, DEFAULT_IPV6_SUBNET_PREFIX), isInternal: false };
};
