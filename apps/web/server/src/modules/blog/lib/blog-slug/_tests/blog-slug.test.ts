import { describe, expect, it } from 'vitest';

import { BLOG } from '../../../config/blog.constants';
import { blogSlug, uniqueBlogSlug } from '../blog-slug';

describe('blogSlug', () => {
  it('prefers the slug the editor typed', () => {
    expect(blogSlug({ title: 'Что нового', slug: 'whats-new' })).toBe('whats-new');
  });

  it('transliterates a Russian title', () => {
    expect(blogSlug({ title: 'Разбор патча 1.45' })).toMatch(/^[a-z0-9-]+$/);
  });

  it('falls back when the title has nothing to slugify', () => {
    expect(blogSlug({ title: '!!!' })).toBe(BLOG.slugFallback);
  });

  it('moves a slug off a route the blog reserves', () => {
    BLOG.reservedSlugs.forEach((reserved) => expect(blogSlug({ title: reserved, slug: reserved })).not.toBe(reserved));
  });

  it('never exceeds the slug length or ends with a dash', () => {
    const slug = blogSlug({ title: 'a '.repeat(BLOG.slugMaxLength) });

    expect(slug.length).toBeLessThanOrEqual(BLOG.slugMaxLength);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('uniqueBlogSlug', () => {
  it('appends the suffix within the length limit', () => {
    const slug = uniqueBlogSlug({ base: 'x'.repeat(BLOG.slugMaxLength), suffix: 'a1b2c3' });

    expect(slug.length).toBeLessThanOrEqual(BLOG.slugMaxLength);
    expect(slug.endsWith('-a1b2c3')).toBe(true);
  });
});
