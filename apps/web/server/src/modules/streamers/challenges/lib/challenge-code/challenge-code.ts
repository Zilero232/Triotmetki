import { CHALLENGE_CODE } from './challenge-code.constants';

export const extractChallengeCodes = (message: string): string[] =>
  [...message.toUpperCase().matchAll(CHALLENGE_CODE.token)].flatMap((found) => (found[1] ? [found[1]] : []));
