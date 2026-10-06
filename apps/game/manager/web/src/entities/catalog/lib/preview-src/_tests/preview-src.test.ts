import { describe, expect, it } from 'vitest';

import { previewPath } from '../preview-src';

describe('previewPath', () => {
  it('joins the manifest-relative file onto the previews folder', () => {
    expect(previewPath({ previewsDir: 'C:\\Program Files\\Three Marks\\resources\\', file: 'previews/core.png' })).toBe(
      'C:\\Program Files\\Three Marks\\resources\\previews\\core.png'
    );
  });

  it('has no preview without a folder', () => {
    expect(previewPath({ previewsDir: null, file: 'previews/core.png' })).toBeNull();
  });

  it('has no preview without a file', () => {
    expect(previewPath({ previewsDir: 'C:\\x', file: null })).toBeNull();
  });

  it('refuses a path that climbs out of the folder', () => {
    expect(previewPath({ previewsDir: 'C:\\x', file: '../secret.png' })).toBeNull();
  });
});
