import { createHmac } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REPLAY_UPLOAD } from '../../../config/upload.constants';
import { fileDigest, replayExtension, replayStorageKey, sha256Hex, tracksStorageKey } from '../replay-file';

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

describe('fileDigest', () => {
  it('continues a keyed hash over the file bytes, as if the prefix and the file were hashed in one piece', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'otmetki-digest-'));
    const path = join(folder, 'replay');
    const bytes = Buffer.alloc(200_000, 7);

    await writeFile(path, bytes);

    const digest = await fileDigest({ hash: createHmac('sha256', 'key').update('prefix\n'), path });

    await rm(folder, { recursive: true, force: true });

    expect(digest).toBe(
      createHmac('sha256', 'key')
        .update(Buffer.concat([Buffer.from('prefix\n'), bytes]))
        .digest('hex')
    );
  });
});
