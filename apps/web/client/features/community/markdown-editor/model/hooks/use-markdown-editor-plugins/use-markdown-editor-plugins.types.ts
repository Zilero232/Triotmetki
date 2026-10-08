import type { ImageUploadHandler } from '@mdxeditor/editor';
import type { ComponentType } from 'react';

export type MarkdownImageUpload = NonNullable<ImageUploadHandler>;

export type MarkdownToolbarProps = {
  canInsertImage: boolean;
};

export type UseMarkdownEditorPluginsInput = {
  toolbar: ComponentType<MarkdownToolbarProps>;
  onImageUpload?: MarkdownImageUpload;
};
