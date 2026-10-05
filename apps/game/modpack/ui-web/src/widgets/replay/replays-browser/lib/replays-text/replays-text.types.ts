import type { ReplaysStringKey } from '../../config';

export type ReplaysTextParams = Record<string, number | string>;

export type ReplaysText = (key: ReplaysStringKey, params?: ReplaysTextParams) => string;
