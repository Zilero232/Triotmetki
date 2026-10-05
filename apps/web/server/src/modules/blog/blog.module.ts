import { Module } from '@nestjs/common';

import { ObjectStorageModule } from '../../core';
import { BlogEditorController } from './blog-editor.controller';
import { BlogController } from './blog.controller';
import { BLOG_IMAGES } from './config/image.constants';
import { blogTagsQueriesProvider } from './providers/blog-tags-queries.provider';
import { BlogImageService } from './services/blog-image.service';
import { BlogReaderService } from './services/blog-reader.service';
import { BlogRssReaderService } from './services/blog-rss-reader.service';
import { BlogWriterService } from './services/blog-writer.service';

@Module({
  imports: [ObjectStorageModule.register({ root: BLOG_IMAGES.root })],
  controllers: [BlogController, BlogEditorController],
  providers: [blogTagsQueriesProvider, BlogReaderService, BlogRssReaderService, BlogImageService, BlogWriterService]
})
export class BlogModule {}
