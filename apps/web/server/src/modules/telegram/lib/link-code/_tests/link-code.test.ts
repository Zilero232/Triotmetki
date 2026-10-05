import { describe, expect, it } from 'vitest';

import { randomCode } from '../../../../../common/lib';
import { LINK_CODE } from '../../../config/link-code.constants';
import { linkConfirmData, looksLikeLinkCode, normaliseLinkCode, parseLinkConfirm } from '../link-code';

describe('link codes', () => {
  it('recognises codes generated from the link-code alphabet', () => {
    const code = randomCode(LINK_CODE);

    expect(code).toHaveLength(LINK_CODE.length);
    expect(looksLikeLinkCode(code)).toBe(true);
  });

  it('accepts a code typed in lower case with spaces', () => {
    expect(looksLikeLinkCode(' abcd efgh ')).toBe(true);
    expect(normaliseLinkCode(' abcd efgh ')).toBe('ABCDEFGH');
  });

  it('rejects characters outside the unambiguous alphabet', () => {
    expect(looksLikeLinkCode('ABCDEFG0')).toBe(false);
    expect(looksLikeLinkCode('/start')).toBe(false);
  });
});

describe('link confirmation data', () => {
  const code = randomCode(LINK_CODE);

  it('round-trips a confirmation with its code', () => {
    expect(parseLinkConfirm(linkConfirmData({ answer: 'yes', code }))).toEqual({ answer: 'yes', code });
  });

  it('round-trips a refusal', () => {
    expect(parseLinkConfirm(linkConfirmData({ answer: 'no' }))).toEqual({ answer: 'no' });
  });

  it('rejects a confirmation whose code is not a link code', () => {
    expect(parseLinkConfirm(`${linkConfirmData({ answer: 'yes', code })}!`)).toBeNull();
  });

  it('rejects data from another keyboard', () => {
    expect(parseLinkConfirm('settings/0')).toBeNull();
  });

  it('fits into the Telegram callback data limit', () => {
    expect(new TextEncoder().encode(linkConfirmData({ answer: 'yes', code })).length).toBeLessThanOrEqual(64);
  });
});
