import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { MOD_REQUEST } from '../../../config/device.constants';
import { isFreshTimestamp, isNonce, requestPath, signedMessage } from '../request-signature';

const MOD_SIGNATURE_VECTOR = '7c6576dee0e349dfbd5997cdc94ebf348ddd00ff669762e869f89074eb845078';
const NOW = new Date('2026-09-27T12:00:00.000Z');
const NOW_SECONDS = NOW.getTime() / 1000;
const BASE = { method: 'post', path: '/mod/ingest', timestamp: String(NOW_SECONDS), nonce: 'n'.repeat(16), body: Buffer.from('{}') };

describe('signedMessage', () => {
  it('binds the version, method, path, timestamp and nonce ahead of the raw body', () => {
    expect(signedMessage(BASE).toString()).toBe(`${MOD_REQUEST.version}\nPOST\n/mod/ingest\n${NOW_SECONDS}\n${'n'.repeat(16)}\n{}`);
  });

  it('changes when the request is replayed against another path', () => {
    expect(signedMessage(BASE).equals(signedMessage({ ...BASE, path: '/mod/settings' }))).toBe(false);
  });

  it('binds each signed header as a lower-case name:value line between the nonce and the body', () => {
    const message = signedMessage({ ...BASE, headers: [{ name: 'X-Otmetki-Visibility', value: 'public' }] });

    expect(message.toString()).toBe(`${MOD_REQUEST.version}
POST
/mod/ingest
${NOW_SECONDS}
${'n'.repeat(16)}
x-otmetki-visibility:public
{}`);
  });

  it('stays the plain v2 message when no signed header is sent', () => {
    expect(signedMessage({ ...BASE, headers: [] }).equals(signedMessage(BASE))).toBe(true);
  });

  it('produces the signature the mod computes for the same replay upload', () => {
    const message = signedMessage({
      method: 'POST',
      path: '/replays/mod',
      timestamp: '1790000000',
      nonce: 'n'.repeat(32),
      headers: [{ name: 'x-otmetki-visibility', value: 'public' }],
      body: Buffer.from('REPLAY')
    });

    expect(createHmac('sha256', 's'.repeat(40)).update(message).digest('hex')).toBe(MOD_SIGNATURE_VECTOR);
  });
});

describe('isFreshTimestamp', () => {
  it('accepts a timestamp exactly at the allowed skew on either side', () => {
    expect(isFreshTimestamp({ timestamp: String(NOW_SECONDS - MOD_REQUEST.maxSkewSeconds), now: NOW })).toBe(true);
    expect(isFreshTimestamp({ timestamp: String(NOW_SECONDS + MOD_REQUEST.maxSkewSeconds), now: NOW })).toBe(true);
  });

  it('rejects a timestamp one second past the allowed skew', () => {
    expect(isFreshTimestamp({ timestamp: String(NOW_SECONDS - MOD_REQUEST.maxSkewSeconds - 1), now: NOW })).toBe(false);
  });

  it('rejects a timestamp one second ahead of the allowed skew, as from a fast clock', () => {
    expect(isFreshTimestamp({ timestamp: String(NOW_SECONDS + MOD_REQUEST.maxSkewSeconds + 1), now: NOW })).toBe(false);
  });

  it('rejects a timestamp in milliseconds, a negative one and a fractional one', () => {
    expect(isFreshTimestamp({ timestamp: String(NOW.getTime()), now: NOW })).toBe(false);
    expect(isFreshTimestamp({ timestamp: `-${NOW_SECONDS}`, now: NOW })).toBe(false);
    expect(isFreshTimestamp({ timestamp: `${NOW_SECONDS}.5`, now: NOW })).toBe(false);
  });

  it('rejects a missing or non-numeric timestamp', () => {
    expect(isFreshTimestamp({ timestamp: undefined, now: NOW })).toBe(false);
    expect(isFreshTimestamp({ timestamp: '1e9', now: NOW })).toBe(false);
  });
});

describe('isNonce', () => {
  it('accepts a url-safe token of the allowed length', () => {
    expect(isNonce('a'.repeat(16))).toBe(true);
  });

  it('rejects a short, missing or unsafe nonce', () => {
    expect(isNonce('a'.repeat(15))).toBe(false);
    expect(isNonce(undefined)).toBe(false);
    expect(isNonce(`${'a'.repeat(16)}:x`)).toBe(false);
  });
});

describe('requestPath', () => {
  it('drops the query string', () => {
    expect(requestPath('/mod/settings/apply/1/result?x=1')).toBe('/mod/settings/apply/1/result');
  });
});
