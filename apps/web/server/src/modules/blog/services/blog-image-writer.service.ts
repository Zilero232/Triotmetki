import type { BlogImageUpload } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { BlogImageFile, UploadedBlogImage } from '../blog.types';

import { AppBadRequestException, AppNotFoundException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { ObjectStorage, StorageObjectMissingError } from '../../../core';
import { BLOG_IMAGES } from '../config/image.constants';
import { detectImageType, imageTypeOf } from '../lib/image-type/image-type';
import { imageFileUrl } from '../lib/image-url/image-url';

@Injectable()
export class BlogImageWriterService {
  constructor(
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService
  ) {}

  async upload(file: UploadedBlogImage | undefined): Promise<BlogImageUpload> {
    if (!file || file.size === 0) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'Attach an image');
    }

    if (file.size > BLOG_IMAGES.maxBytes) {
      throw new AppBadRequestException('VALIDATION_FAILED', `The image is larger than ${BLOG_IMAGES.maxBytes} bytes`);
    }

    const bytes = new Uint8Array(file.buffer);
    const type = await detectImageType(bytes);

    if (!type) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'The image must be a PNG, JPEG, WebP or AVIF image');
    }

    const key = `${BLOG_IMAGES.prefix}/${randomUUID()}.${type.extension}`;

    await this.storage.put({ key, body: bytes, contentType: type.contentType });

    return { key, url: imageFileUrl({ key, apiUrl: this.config.get('API_URL') }) };
  }

  async read(file: string): Promise<BlogImageFile> {
    const type = imageTypeOf(file.split('.').pop() ?? '');

    if (!type) {
      throw new AppNotFoundException('NOT_FOUND', `No image ${file}`);
    }

    try {
      return { bytes: await this.storage.get(`${BLOG_IMAGES.prefix}/${file}`), contentType: type.contentType };
    } catch (error) {
      if (error instanceof StorageObjectMissingError) {
        throw new AppNotFoundException('NOT_FOUND', `No image ${file}`);
      }

      throw error;
    }
  }

  async remove(key: string | null): Promise<void> {
    if (key) {
      await this.storage.remove(key);
    }
  }
}
