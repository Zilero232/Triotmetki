import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MODPACK_RELEASES_SOURCE } from '../../config/modpack-releases.constants';
import { DownloadFilesReaderService } from '../download-files-reader.service';

describe('DownloadFilesReaderService', () => {
  let dir = '';
  let service: DownloadFilesReaderService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'otmetki-downloads-'));
    service = new DownloadFilesReaderService(join(dir, 'releases.json'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('has no files in an empty downloads folder', async () => {
    await expect(service.sizes()).resolves.toEqual({ modpack: null, manager: null });
  });

  it('reads the sizes of the published files next to the index', async () => {
    await writeFile(join(dir, MODPACK_RELEASES_SOURCE.files.modpack), 'x'.repeat(3));
    await writeFile(join(dir, MODPACK_RELEASES_SOURCE.files.manager), 'x'.repeat(5));

    await expect(service.sizes()).resolves.toEqual({ modpack: 3, manager: 5 });
  });

  it('ignores a directory in place of a file', async () => {
    await mkdir(join(dir, MODPACK_RELEASES_SOURCE.files.manager));

    await expect(service.sizes()).resolves.toEqual({ modpack: null, manager: null });
  });
});
