'use client';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  UndoRedo
} from '@mdxeditor/editor';

import type { MarkdownToolbarProps } from '../../../model/hooks';

export const EditorToolbar = ({ canInsertImage }: MarkdownToolbarProps) => (
  <>
    <UndoRedo />
    <Separator />
    <BlockTypeSelect />
    <BoldItalicUnderlineToggles />
    <Separator />
    <ListsToggle />
    <CreateLink />
    {canInsertImage && <InsertImage />}
    <InsertTable />
    <InsertThematicBreak />
  </>
);
