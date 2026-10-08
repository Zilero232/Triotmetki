'use client';

import {
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin
} from '@mdxeditor/editor';
import { useTheme } from 'next-themes';
import { createElement, useMemo } from 'react';

import type { UseMarkdownEditorPluginsInput } from './use-markdown-editor-plugins.types';

import { MARKDOWN_EDITOR } from '../../../config';

export const useMarkdownEditorPlugins = ({ toolbar, onImageUpload }: UseMarkdownEditorPluginsInput) => {
  const { resolvedTheme } = useTheme();
  const plugins = useMemo(() => {
    const canInsertImage = onImageUpload !== undefined;
    const imagePlugins = canInsertImage ? [imagePlugin({ imageUploadHandler: onImageUpload })] : [];

    return [
      headingsPlugin({ allowedHeadingLevels: MARKDOWN_EDITOR.headingLevels }),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      ...imagePlugins,
      markdownShortcutPlugin(),
      toolbarPlugin({ toolbarContents: () => createElement(toolbar, { canInsertImage }) })
    ];
  }, [toolbar, onImageUpload]);

  return {
    plugins,
    themeClassName: resolvedTheme === MARKDOWN_EDITOR.darkTheme ? MARKDOWN_EDITOR.darkThemeClass : undefined
  };
};
