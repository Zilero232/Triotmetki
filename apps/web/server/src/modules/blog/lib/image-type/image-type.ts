import { fileTypeFromBuffer } from 'file-type';
import { entries } from 'remeda';

import type { ImageExtension, ImageType } from './image-type.types';

import { BLOG_IMAGES } from '../../config/image.constants';

export const imageTypeOf = (extension: string): ImageType | null => {
  const found = entries(BLOG_IMAGES.types).find(([key]) => key === extension);

  return found ? { extension: found[0], contentType: found[1] } : null;
};

export const detectImageType = async (bytes: Uint8Array): Promise<ImageType | null> => {
  const detected = await fileTypeFromBuffer(bytes);
  const found = detected ? entries(BLOG_IMAGES.types).find(([, mime]) => mime === detected.mime) : undefined;

  return found ? { extension: found[0] satisfies ImageExtension, contentType: found[1] } : null;
};
