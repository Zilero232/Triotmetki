import { describe, expect, it } from 'vitest';

import { BLOG } from '../../../config/blog.constants';
import { outlineArticle } from '../article-outline';

const wordsOf = (count: number) => Array.from({ length: count }).fill('слово').join(' ');

describe('outlineArticle', () => {
  it('lists second and third level headings in document order with slug ids', () => {
    const { toc } = outlineArticle('# Title\n\n## Первый раздел\n\ntext\n\n### Detail one\n\n#### Too deep\n\n## Second');

    expect(toc).toEqual([
      { id: 'первый-раздел', text: 'Первый раздел', depth: 2 },
      { id: 'detail-one', text: 'Detail one', depth: 3 },
      { id: 'second', text: 'Second', depth: 2 }
    ]);
  });

  it('keeps heading ids unique the way rehype-slug numbers duplicates', () => {
    const { toc } = outlineArticle('## Итоги\n\n## Итоги');

    expect(toc.map(({ id }) => id)).toEqual(['итоги', 'итоги-1']);
  });

  it('counts a duplicate from a skipped level so later ids still match the rendered page', () => {
    const { toc } = outlineArticle('# Summary\n\n## Summary');

    expect(toc).toEqual([{ id: 'summary-1', text: 'Summary', depth: 2 }]);
  });

  it('never reports less than one minute', () => {
    expect(outlineArticle('Коротко.').readingMinutes).toBe(1);
  });

  it('rounds reading time up at the words-per-minute boundary', () => {
    expect(outlineArticle(wordsOf(BLOG.wordsPerMinute)).readingMinutes).toBe(1);
    expect(outlineArticle(wordsOf(BLOG.wordsPerMinute + 1)).readingMinutes).toBe(2);
  });
});
