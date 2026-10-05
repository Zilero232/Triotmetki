import { FileInterceptor } from '@nestjs/platform-express';

import { BLOG_IMAGES } from '../../config/image.constants';

export const BlogImageFileInterceptor = FileInterceptor(BLOG_IMAGES.field, { limits: { fileSize: BLOG_IMAGES.maxBytes, files: 1 } });
