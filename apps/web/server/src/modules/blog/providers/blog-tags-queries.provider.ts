import { BLOG_QUERY_TOKENS } from '../config/queries.constants';
import { BLOG_TAGS_QUERIES } from '../queries/blog-tags.queries';

export const blogTagsQueriesProvider = {
  provide: BLOG_QUERY_TOKENS.tags,
  useValue: BLOG_TAGS_QUERIES
};
