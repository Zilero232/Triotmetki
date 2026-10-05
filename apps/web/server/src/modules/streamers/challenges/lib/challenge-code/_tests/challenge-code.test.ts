import { describe, expect, it } from 'vitest';

import { randomCode } from '../../../../../../common/lib';
import { CHALLENGE } from '../../../config/challenge.constants';
import { extractChallengeCodes } from '../challenge-code';

describe('challenge codes', () => {
  it('reads back a code generated from the challenge alphabet', () => {
    const code = randomCode({ alphabet: CHALLENGE.codeAlphabet, length: CHALLENGE.codeLength });

    expect(code).toHaveLength(CHALLENGE.codeLength);
    expect(extractChallengeCodes(`donate ${CHALLENGE.codePrefix}${code}!`)).toEqual([code]);
  });
});

describe('extractChallengeCodes', () => {
  it('does not read a code out of a longer word', () => {
    expect(extractChallengeCodes('ABCDEFGH')).toEqual([]);
  });

  it('finds every code in a message', () => {
    expect(extractChallengeCodes('#ABCDE and #XYZ23')).toEqual(['ABCDE', 'XYZ23']);
  });
});
