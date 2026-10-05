import type { Database } from '../../../core';
import type { BLOG_TAGS_QUERIES } from './blog-tags.queries';

export type BlogTagCountsInput = {
  db: Database;
  limit: number;
};

export type BlogTagsQueries = typeof BLOG_TAGS_QUERIES;
