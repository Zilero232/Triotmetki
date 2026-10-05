import type { REPLAYS_RU } from './ru';

export type ReplaysStringKey = keyof typeof REPLAYS_RU;

export type ReplaysStrings = Record<ReplaysStringKey, string>;
