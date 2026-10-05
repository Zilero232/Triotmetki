import type { BlogEditorAccess, BlogEditorPost } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { isIncludedIn } from 'remeda';

import type { CreateBlogPostRequest, SlugWriteInput, UpdateBlogPostRequest } from '../blog.types';
import type { BlogPostRow } from '../selects/blog-post.types';

import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { isUniqueViolation, PrismaService } from '../../../core';
import { BLOG } from '../config/blog.constants';
import { outlineArticle } from '../lib/article-outline/article-outline';
import { blogSlug, uniqueBlogSlug } from '../lib/blog-slug/blog-slug';
import { toBlogEditorPostView } from '../mappers/blog-post-view.mappers';
import { BLOG_POST_INCLUDE } from '../selects/blog-post.selects';
import { BlogImageService } from './blog-image.service';

@Injectable()
export class BlogWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly images: BlogImageService
  ) {}

  async access(userId: string | null): Promise<BlogEditorAccess> {
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null;

    return { canEdit: user !== null && isIncludedIn(user.role, BLOG.editorRoles) };
  }

  async list(): Promise<BlogEditorPost[]> {
    const rows = await this.prisma.blogPost.findMany({ orderBy: { updatedAt: 'desc' }, take: BLOG.editorLimit, include: BLOG_POST_INCLUDE });

    return rows.map((post) => this.view(post));
  }

  async byId(id: string): Promise<BlogEditorPost> {
    return this.view(await this.find(id));
  }

  async create({ userId, slug, title, body, status, coverKey, coverUrl, ...fields }: CreateBlogPostRequest): Promise<BlogEditorPost> {
    this.assertOneCover({ coverKey, coverUrl });

    const base = blogSlug({ title, slug });
    const isTaken = (await this.prisma.blogPost.count({ where: { slug: base } })) > 0;

    if (isTaken && slug !== undefined) {
      throw new AppConflictException('CONFLICT', `The slug ${slug} is taken`);
    }

    const free = isTaken ? uniqueBlogSlug({ base, suffix: randomBytes(3).toString('hex') }) : base;

    const post = await this.withFreeSlug({
      slug: free,
      write: () =>
        this.prisma.blogPost.create({
          data: {
            ...fields,
            slug: free,
            title,
            body,
            status,
            coverKey,
            coverUrl,
            authorUserId: userId,
            readingMinutes: outlineArticle(body).readingMinutes,
            publishedAt: status === 'published' ? new Date() : null
          },
          include: BLOG_POST_INCLUDE
        })
    });

    return this.view(post);
  }

  async update({ id, ...changes }: UpdateBlogPostRequest): Promise<BlogEditorPost> {
    const current = await this.find(id);
    const slug = changes.slug === undefined ? undefined : blogSlug({ title: current.title, slug: changes.slug });
    const fields = { ...changes, ...(slug === undefined ? {} : { slug }) };

    this.assertOneCover({
      coverKey: fields.coverKey === undefined ? current.coverKey : fields.coverKey,
      coverUrl: fields.coverUrl === undefined ? current.coverUrl : fields.coverUrl
    });

    if (slug !== undefined && slug !== current.slug) {
      const isTaken = (await this.prisma.blogPost.count({ where: { slug } })) > 0;

      if (isTaken) {
        throw new AppConflictException('CONFLICT', `The slug ${slug} is taken`);
      }
    }

    const isFirstPublish = fields.status === 'published' && current.publishedAt === null;

    const post = await this.withFreeSlug({
      slug: slug ?? current.slug,
      write: () =>
        this.prisma.blogPost.update({
          where: { id },
          data: {
            ...fields,
            ...(fields.body === undefined ? {} : { readingMinutes: outlineArticle(fields.body).readingMinutes }),
            ...(isFirstPublish ? { publishedAt: new Date() } : {})
          },
          include: BLOG_POST_INCLUDE
        })
    });

    if (current.coverKey !== post.coverKey) {
      await this.images.remove(current.coverKey);
    }

    return this.view(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.find(id);

    await this.prisma.blogPost.delete({ where: { id } });
    await this.images.remove(post.coverKey);
  }

  private async find(id: string): Promise<BlogPostRow> {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, include: BLOG_POST_INCLUDE });

    if (!post) {
      throw new AppNotFoundException('NOT_FOUND', `No blog post ${id}`);
    }

    return post;
  }

  private async withFreeSlug<T>({ slug, write }: SlugWriteInput<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', `The slug ${slug} is taken`);
      }

      throw error;
    }
  }

  private assertOneCover({ coverKey, coverUrl }: Pick<BlogPostRow, 'coverKey' | 'coverUrl'>): void {
    if (coverKey && coverUrl) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'Use either an uploaded cover or a cover URL, not both');
    }
  }

  private view(post: BlogPostRow): BlogEditorPost {
    return toBlogEditorPostView({ post, apiUrl: this.config.get('API_URL') });
  }
}
