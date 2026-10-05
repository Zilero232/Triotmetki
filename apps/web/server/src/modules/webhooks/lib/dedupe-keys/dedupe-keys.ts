import type { MarkGainedKeyInput } from './dedupe-keys.types';

export const markGainedKey = ({ accountId, tankId, marks }: MarkGainedKeyInput): string => `mark:${accountId}:${tankId}:${marks}`;
