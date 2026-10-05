import { CHALLENGE } from '../../config/challenge.constants';

export const CHALLENGE_CODE = {
  token: new RegExp(String.raw`${CHALLENGE.codePrefix}?\b([${CHALLENGE.codeAlphabet}]{${CHALLENGE.codeLength}})\b`, 'gu')
} as const;
