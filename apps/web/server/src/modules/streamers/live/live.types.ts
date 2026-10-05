import type { LiveStream } from './lib/live-status';

export type CachedToken = {
  value: string;
  expiresAt: number;
};

export type SafePollInput = {
  platform: string;
  run: () => Promise<LiveStream[]>;
};
