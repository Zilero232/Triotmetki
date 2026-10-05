import type { BlogPostRow } from '../selects/blog-post.types';

export type ToBlogPostViewInput = {
  post: BlogPostRow;
  apiUrl: string;
};
