import type { BlogCoverInput, ImageFileUrlInput } from './image-url.types';

import { BLOG_IMAGES } from '../../config/image.constants';

export const imageFileUrl = ({ key, apiUrl }: ImageFileUrlInput): string =>
  new URL(BLOG_IMAGES.route.replace('{file}', key.slice(BLOG_IMAGES.prefix.length + 1)), apiUrl).href;

export const blogCoverUrl = ({ post, apiUrl }: BlogCoverInput): string | null =>
  post.coverKey ? imageFileUrl({ key: post.coverKey, apiUrl }) : post.coverUrl;
