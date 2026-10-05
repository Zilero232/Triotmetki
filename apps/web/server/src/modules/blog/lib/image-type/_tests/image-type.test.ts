import { describe, expect, it } from 'vitest';

import { BLOG_IMAGES } from '../../../config/image.constants';
import { detectImageType, imageTypeOf } from '../image-type';

const PNG_BYTES = Uint8Array.from(
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
);

describe('detectImageType', () => {
  it('recognises a PNG by its bytes', async () => {
    expect(await detectImageType(PNG_BYTES)).toEqual({ extension: 'png', contentType: BLOG_IMAGES.types.png });
  });

  it('refuses bytes that are not an allowed image', async () => {
    expect(await detectImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });
});

describe('imageTypeOf', () => {
  it('maps every allowed extension to its content type', () => {
    Object.entries(BLOG_IMAGES.types).forEach(([extension, contentType]) => {
      expect(imageTypeOf(extension)?.contentType).toBe(contentType);
    });
  });

  it('returns null for an unknown extension', () => {
    expect(imageTypeOf('gif')).toBeNull();
  });
});
