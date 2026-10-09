import { httpsUrlSchema } from '@otmetki/schemas';
import * as z from 'zod';

import { zCreateBlogPost } from '@/entities/blog/post';

import { splitTags } from './blog-post-form';

const optionalText = <T extends z.ZodType<string, string>>(schema: T) =>
  z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), schema]));

export const blogPostFormSchema = z.object({
  title: z.string().trim().pipe(zCreateBlogPost.shape.title),
  slug: optionalText(zCreateBlogPost.shape.slug.unwrap()),
  excerpt: z.string().trim().pipe(zCreateBlogPost.shape.excerpt),
  body: z.string().trim().pipe(zCreateBlogPost.shape.body),
  category: zCreateBlogPost.shape.category,
  locale: zCreateBlogPost.shape.locale.unwrap().unwrap(),
  tags: z.string().transform(splitTags).pipe(zCreateBlogPost.shape.tags.unwrap()),
  coverKey: z.string().nullable(),
  coverUrl: optionalText(httpsUrlSchema),
  seoTitle: optionalText(zCreateBlogPost.shape.seoTitle.unwrap().unwrap().unwrap()),
  seoDescription: optionalText(zCreateBlogPost.shape.seoDescription.unwrap().unwrap().unwrap()),
  isFeatured: z.boolean()
});
