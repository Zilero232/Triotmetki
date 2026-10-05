import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { encryptStream } from '../../_tests/replay-builder';
import { ReplayFormatError } from '../../errors/replay-format-error';
import { decryptStream, unpackStream } from '../stream';

const BOMB_BYTES = 64 * 1024 * 1024 + 1;

describe('replay stream cipher', () => {
  it('undoes Blowfish ECB with the chained XOR over whole blocks', () => {
    const plain = Uint8Array.from({ length: 64 }, (_, index) => (index * 37) % 256);

    expect(decryptStream(encryptStream(plain))).toEqual(plain);
  });

  it('decrypts and inflates a section, ignoring the zero padding of the last block', () => {
    const plain = new TextEncoder().encode('packets '.repeat(50));
    const compressed = new Uint8Array(deflateSync(plain));

    const inflated = unpackStream({
      compressedSize: compressed.byteLength,
      data: encryptStream(compressed),
      decompressedSize: plain.byteLength
    });

    expect(inflated).toEqual(plain);
  });

  it('refuses a decompression bomb that inflates past what a real battle produces', () => {
    const compressed = new Uint8Array(deflateSync(new Uint8Array(BOMB_BYTES)));

    expect(() =>
      unpackStream({ compressedSize: compressed.byteLength, data: encryptStream(compressed), decompressedSize: compressed.byteLength })
    ).toThrow(ReplayFormatError);
  });

  it('reports a stream that does not inflate as a format error', () => {
    const data = encryptStream(new Uint8Array(32).fill(7));

    expect(() => unpackStream({ compressedSize: 32, data, decompressedSize: 0 })).toThrow(ReplayFormatError);
  });
});
