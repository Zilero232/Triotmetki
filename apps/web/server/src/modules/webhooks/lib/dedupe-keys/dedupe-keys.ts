import type { MarkGainedKeyInput } from './dedupe-keys.types';

export const markGainedKey = ({ source, accountId, tankId, marks }: MarkGainedKeyInput): string => `mark:${source}:${accountId}:${tankId}:${marks}`;
