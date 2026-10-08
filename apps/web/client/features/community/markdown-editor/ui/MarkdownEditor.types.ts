import type { ReactNode } from 'react';

import type { MarkdownImageUpload } from '../model/hooks';

export type MarkdownEditorProps = {
  markdown: string;
  placeholder?: ReactNode;
  isInvalid?: boolean;
  onChange: (markdown: string) => void;
  onImageUpload?: MarkdownImageUpload;
};
