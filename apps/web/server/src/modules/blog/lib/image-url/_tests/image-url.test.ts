import { describe, expect, it } from 'vitest';

import { BLOG_IMAGES } from '../../../config/image.constants';
import { blogCoverUrl, imageFileUrl } from '../image-url';

const API_URL = 'https://api.triotmetki.ru';
const IMAGE_FILE = '0b4c8f1e-2a6d-4c1b-9f5e-3d7a8b9c0d1e.webp';
const COVER_KEY = `${BLOG_IMAGES.prefix}/${IMAGE_FILE}`;

describe('imageFileUrl', () => {
  it('points at the public image route of the API', () => {
    expect(imageFileUrl({ key: COVER_KEY, apiUrl: API_URL })).toBe(new URL(BLOG_IMAGES.route.replace('{file}', IMAGE_FILE), API_URL).href);
  });
});

describe('blogCoverUrl', () => {
  it('prefers the uploaded cover', () => {
    expect(blogCoverUrl({ post: { coverKey: COVER_KEY, coverUrl: 'https://example.com/a.png' }, apiUrl: API_URL })).toContain(IMAGE_FILE);
  });

  it('falls back to the external cover URL', () => {
    expect(blogCoverUrl({ post: { coverKey: null, coverUrl: 'https://example.com/a.png' }, apiUrl: API_URL })).toBe('https://example.com/a.png');
  });

  it('returns null without any cover', () => {
    expect(blogCoverUrl({ post: { coverKey: null, coverUrl: null }, apiUrl: API_URL })).toBeNull();
  });
});
