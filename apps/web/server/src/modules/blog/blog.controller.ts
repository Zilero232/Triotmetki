import { Controller, Get, Header, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { BLOG_FEED } from './config/feed.constants';
import { BLOG_IMAGES } from './config/image.constants';
import { BlogArticleDto, BlogImageParamsDto, BlogPostPageDto, BlogPostsQueryDto, BlogSlugParamsDto, BlogTagsDto } from './dto/blog.dto';
import { BlogImageService } from './services/blog-image.service';
import { BlogReaderService } from './services/blog-reader.service';
import { BlogRssReaderService } from './services/blog-rss-reader.service';

@ApiTags('blog')
@AllowAnonymous()
@Controller('blog')
export class BlogController {
  constructor(
    private readonly posts: BlogReaderService,
    private readonly feed: BlogRssReaderService,
    private readonly images: BlogImageService
  ) {}

  @Get('posts')
  @ZodResponse({ type: BlogPostPageDto })
  list(@Query() query: BlogPostsQueryDto) {
    return this.posts.list(query);
  }

  @Get('posts/:slug')
  @ZodResponse({ type: BlogArticleDto })
  article(@Param() { slug }: BlogSlugParamsDto) {
    return this.posts.article(slug);
  }

  @Get('tags')
  @ZodResponse({ type: BlogTagsDto })
  tags() {
    return this.posts.tags();
  }

  @Get('rss.xml')
  @Header('content-type', BLOG_FEED.contentType)
  @Header('cache-control', BLOG_FEED.cacheControl)
  @ApiProduces(BLOG_FEED.contentType)
  @ApiOkResponse({ schema: { type: 'string' } })
  rss() {
    return this.feed.rss();
  }

  @Get('images/:file')
  @Header('cache-control', BLOG_IMAGES.cacheControl)
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async image(@Param() { file }: BlogImageParamsDto) {
    const { bytes, contentType } = await this.images.read(file);

    return new StreamableFile(bytes, { type: contentType, length: bytes.byteLength });
  }
}
