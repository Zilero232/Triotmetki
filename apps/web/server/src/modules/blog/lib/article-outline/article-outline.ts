import type { BlogTocItem } from '@otmetki/schemas';

import rehypeExtractToc from '@stefanprobst/rehype-extract-toc';
import readingTime from 'reading-time';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { isIncludedIn } from 'remeda';
import { unified } from 'unified';
import { VFile } from 'vfile';

import type { ArticleOutline, TocEntry } from './article-outline.types';

import { BLOG } from '../../config/blog.constants';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeSlug).use(rehypeExtractToc);

const flattenToc = (entries: TocEntry[]): BlogTocItem[] =>
  entries.flatMap(({ id, value, depth, children }) => [
    ...(id && isIncludedIn(depth, BLOG.tocDepths) ? [{ id, text: value, depth }] : []),
    ...flattenToc(children ?? [])
  ]);

export const outlineArticle = (body: string): ArticleOutline => {
  const file = new VFile(body);

  processor.runSync(processor.parse(file), file);

  return {
    toc: flattenToc(file.data.toc ?? []),
    readingMinutes: Math.max(1, Math.ceil(readingTime(body, { wordsPerMinute: BLOG.wordsPerMinute }).minutes))
  };
};
