import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { hmacSha256Hex, matchesSignatureHeader, verifySignatureHeader } from '../hmac';
import { HMAC } from '../hmac.constants';

const key = 'device-secret-string';
const body = Buffer.from('{"a":1,"b":"две"}', 'utf8');
const digest = createHmac('sha256', key).update(body).digest('hex');
const header = `${HMAC.headerPrefix}${digest}`;

describe('verifySignatureHeader', () => {
  it('accepts the signature the mod computes over the raw bytes', () => {
    expect(verifySignatureHeader({ header, key, body })).toBe(true);
  });

  it('accepts an uppercase hex digest', () => {
    expect(verifySignatureHeader({ header: `${HMAC.headerPrefix}${digest.toUpperCase()}`, key, body })).toBe(true);
  });

  it('refuses the same JSON serialised differently', () => {
    const reserialised = Buffer.from(JSON.stringify(JSON.parse(body.toString('utf8')), null, 1));

    expect(verifySignatureHeader({ header, key, body: reserialised })).toBe(false);
  });

  it('refuses a signature made with another key', () => {
    expect(verifySignatureHeader({ header, key: `${key}x`, body })).toBe(false);
  });

  it('refuses a missing, unprefixed or malformed header', () => {
    expect(verifySignatureHeader({ header: undefined, key, body })).toBe(false);
    expect(verifySignatureHeader({ header: hmacSha256Hex({ key, data: body }), key, body })).toBe(false);
    expect(verifySignatureHeader({ header: `${HMAC.headerPrefix}zz`, key, body })).toBe(false);
  });
});

describe('matchesSignatureHeader', () => {
  it('accepts a digest computed elsewhere, such as while the body streamed to disk', () => {
    expect(matchesSignatureHeader({ header, digest })).toBe(true);
  });

  it('refuses a digest of other bytes', () => {
    expect(matchesSignatureHeader({ header, digest: hmacSha256Hex({ key, data: 'other' }) })).toBe(false);
  });

  it('refuses when no digest was computed', () => {
    expect(matchesSignatureHeader({ header, digest: undefined })).toBe(false);
  });

  it('refuses a malformed header even for the right digest', () => {
    expect(matchesSignatureHeader({ header: digest, digest })).toBe(false);
  });
});
