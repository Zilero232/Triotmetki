import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OptionalAuth, Roles } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import type { UploadedBlogImage } from './blog.types';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { IdParamsDto } from '../community-core';
import { BLOG } from './config/blog.constants';
import { BLOG_IMAGES } from './config/image.constants';
import {
  BlogEditorAccessDto,
  BlogEditorPostDto,
  BlogEditorPostListDto,
  BlogImageUploadDto,
  CreateBlogPostDto,
  UpdateBlogPostDto
} from './dto/blog.dto';
import { BlogImageFileInterceptor } from './interceptors/image-file/image-file.interceptor';
import { BlogImageService } from './services/blog-image.service';
import { BlogWriterService } from './services/blog-writer.service';

@ApiTags('blog')
@Controller('blog/editor')
export class BlogEditorController {
  constructor(
    private readonly editor: BlogWriterService,
    private readonly images: BlogImageService
  ) {}

  @OptionalAuth()
  @Get('access')
  @ZodResponse({ type: BlogEditorAccessDto })
  access(@OptionalUserId() userId: string | null) {
    return this.editor.access(userId);
  }

  @Roles([...BLOG.editorRoles])
  @Get('posts')
  @ZodResponse({ type: BlogEditorPostListDto })
  list() {
    return this.editor.list();
  }

  @Roles([...BLOG.editorRoles])
  @Get('posts/:id')
  @ZodResponse({ type: BlogEditorPostDto })
  get(@Param() { id }: IdParamsDto) {
    return this.editor.byId(id);
  }

  @Roles([...BLOG.editorRoles])
  @Post('posts')
  @ZodResponse({ type: BlogEditorPostDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() body: CreateBlogPostDto) {
    return this.editor.create({ ...body, userId });
  }

  @Roles([...BLOG.editorRoles])
  @Patch('posts/:id')
  @ZodResponse({ type: BlogEditorPostDto })
  update(@Param() { id }: IdParamsDto, @Body() body: UpdateBlogPostDto) {
    return this.editor.update({ ...body, id });
  }

  @Roles([...BLOG.editorRoles])
  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() { id }: IdParamsDto) {
    await this.editor.remove(id);
  }

  @Roles([...BLOG.editorRoles])
  @Post('images')
  @Throttle({ default: BLOG_IMAGES.throttle })
  @UseInterceptors(BlogImageFileInterceptor)
  @ApiConsumes('multipart/form-data')
  @ZodResponse({ type: BlogImageUploadDto, status: HttpStatus.CREATED })
  upload(@UploadedFile() file: UploadedBlogImage | undefined) {
    return this.images.upload(file);
  }
}
