import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { ObjectStorage } from '../../../../core';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { StorageObjectMissingError } from '../../../../core';
import { BLOG_IMAGES } from '../../config/image.constants';
import { BlogImageService } from '../blog-image.service';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

const createService = () => {
  const storage = mock<ObjectStorage>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue('http://localhost:4000');

  return { service: new BlogImageService(storage, config), storage };
};

describe('BlogImageService.upload', () => {
  it('stores a real image under the images prefix with its detected type', async () => {
    const { service, storage } = createService();

    const { key, url } = await service.upload({ buffer: PNG, size: PNG.byteLength });

    expect(key).toMatch(new RegExp(`^${BLOG_IMAGES.prefix}/[0-9a-f-]{36}\\.png$`));
    expect(url.endsWith(key.slice(BLOG_IMAGES.prefix.length + 1))).toBe(true);
    expect(storage.put).toHaveBeenCalledWith(expect.objectContaining({ key, contentType: BLOG_IMAGES.types.png }));
  });

  it('refuses a file that only pretends to be an image', async () => {
    const { service, storage } = createService();
    const html = Buffer.from('<html><script>alert(1)</script></html>');

    await expect(service.upload({ buffer: html, size: html.byteLength })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('refuses a missing or empty file', async () => {
    const { service } = createService();

    await expect(service.upload(undefined)).rejects.toBeInstanceOf(AppBadRequestException);
    await expect(service.upload({ buffer: Buffer.alloc(0), size: 0 })).rejects.toBeInstanceOf(AppBadRequestException);
  });

  it('refuses a file over the size limit', async () => {
    const { service } = createService();

    await expect(service.upload({ buffer: PNG, size: BLOG_IMAGES.maxBytes + 1 })).rejects.toBeInstanceOf(AppBadRequestException);
  });
});

describe('BlogImageService.read', () => {
  it('answers 404 for a stored file that is gone', async () => {
    const { service, storage } = createService();

    storage.get.mockRejectedValue(new StorageObjectMissingError('x'));

    await expect(service.read('0b4c8f1e-2a6d-4c1b-9f5e-3d7a8b9c0d1e.png')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('serves the content type of the file extension', async () => {
    const { service, storage } = createService();

    storage.get.mockResolvedValue(new Uint8Array(PNG));

    expect((await service.read('0b4c8f1e-2a6d-4c1b-9f5e-3d7a8b9c0d1e.webp')).contentType).toBe(BLOG_IMAGES.types.webp);
  });
});

describe('BlogImageService.remove', () => {
  it('does nothing without a key', async () => {
    const { service, storage } = createService();

    await service.remove(null);

    expect(storage.remove).not.toHaveBeenCalled();
  });
});
