import ipaddr from 'ipaddr.js';

import type { ResolvesPubliclyInput } from './webhook-url.types';

import { WEBHOOK_URL } from '../../config/webhook-delivery.constants';

const hostOf = (url: string): string => new URL(url).hostname.replace(/^\[|\]$/g, '');

export const isPublicAddress = (address: string): boolean => ipaddr.isValid(address) && ipaddr.process(address).range() === WEBHOOK_URL.allowedRange;

export const isPublicWebhookUrl = (value: string): boolean => {
  if (!URL.canParse(value) || new URL(value).protocol !== WEBHOOK_URL.protocol) {
    return false;
  }

  const host = hostOf(value).toLowerCase();

  if (WEBHOOK_URL.blockedHostSuffixes.some((suffix) => `.${host}`.endsWith(suffix))) {
    return false;
  }

  return !ipaddr.isValid(host) || isPublicAddress(host);
};

export const publicAddressOf = async ({ url, lookup }: ResolvesPubliclyInput): Promise<string | null> => {
  if (!isPublicWebhookUrl(url)) {
    return null;
  }

  const host = hostOf(url);

  if (ipaddr.isValid(host)) {
    return host;
  }

  const addresses = await lookup(host).catch(() => []);
  const [first] = addresses;

  return first && addresses.every(({ address }) => isPublicAddress(address)) ? first.address : null;
};

export const resolvesPublicly = async (input: ResolvesPubliclyInput): Promise<boolean> => (await publicAddressOf(input)) !== null;
