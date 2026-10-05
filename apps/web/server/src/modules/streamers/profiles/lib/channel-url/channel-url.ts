import { CHANNEL_HOSTS } from '@otmetki/schemas';

import type { HandleOfInput, ParseChannelInput, ParsedChannel } from './channel-url.types';

import { CHANNEL_URL } from './channel-url.constants';

const handleOf = ({ platform, url }: HandleOfInput): string | null => {
  const parts = url.pathname.split('/').filter(Boolean);

  if (platform === 'youtube') {
    const [first, second] = parts;

    if (first?.startsWith('@')) {
      return first.toLowerCase();
    }

    if ((first === 'channel' || first === 'c' || first === 'user') && second) {
      return first === 'channel' ? second : second.toLowerCase();
    }

    return null;
  }

  if (platform === 'boosty' || platform === 'telegram' || platform === 'vk' || platform === 'trovo') {
    const [first, second] = parts;

    return (first === 's' && second ? second : first)?.toLowerCase() ?? null;
  }

  return parts[0]?.toLowerCase() ?? null;
};

export const parseChannel = ({ platform, url }: ParseChannelInput): ParsedChannel | null => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hosts: readonly string[] = CHANNEL_HOSTS[platform];

  if (!hosts.includes(parsed.hostname.toLowerCase())) {
    return null;
  }

  const handle = handleOf({ platform, url: parsed });

  if (!handle || !CHANNEL_URL.handle.test(handle)) {
    return null;
  }

  return { platform, handle, url: `https://${hosts[0]}${parsed.pathname.replace(/\/+$/u, '')}` };
};
