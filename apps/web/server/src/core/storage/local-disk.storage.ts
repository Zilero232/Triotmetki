import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type { PutObjectInput } from './storage.types';

import { isMissingFileError } from '../../common/lib';
import { StorageObjectMissingError } from './errors/object-missing-error';
import { ObjectStorage } from './object-storage';

export class LocalDiskStorage extends ObjectStorage {
  private readonly root: string;

  constructor(root: string) {
    super();
    this.root = resolve(root);
  }

  async put({ key, body }: PutObjectInput): Promise<void> {
    const path = this.pathOf(key);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async get(key: string): Promise<Uint8Array> {
    const path = this.pathOf(key);

    try {
      return new Uint8Array(await readFile(path));
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new StorageObjectMissingError(key);
      }

      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  private pathOf(key: string): string {
    const path = resolve(this.root, key);

    if (!path.startsWith(`${this.root}${sep}`)) {
      throw new Error(`Storage key escapes the storage root: ${key}`);
    }

    return path;
  }
}
