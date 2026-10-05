import { describe, expect, it } from 'vitest';

import { REPLAY_UPLOAD } from '../../../config/upload.constants';
import { replayExtension, replayStorageKey, sha256Hex, tracksStorageKey } from '../replay-file';

describe('replayExtension', () => {
  it('accepts every supported extension regardless of case', () => {
    for (const extension of REPLAY_UPLOAD.extensions) {
      expect(replayExtension(`Battle${extension.toUpperCase()}`)).toBe(extension);
    }
  });

  it('rejects other files and a bare extension', () => {
    expect(replayExtension('battle.zip')).toBeNull();
    expect(replayExtension(REPLAY_UPLOAD.extensions[0])).toBeNull();
  });
});

describe('replayStorageKey', () => {
  it('shards by the first two hex characters and keeps the extension', () => {
    const sha256 = sha256Hex(new Uint8Array([1, 2, 3]));
    const key = replayStorageKey({ sha256, extension: '.mtreplay' });

    expect(key).toBe(`${REPLAY_UPLOAD.keyPrefix}/${sha256.slice(0, 2)}/${sha256}.mtreplay`);
    expect(tracksStorageKey(key).startsWith(key)).toBe(true);
  });
});
