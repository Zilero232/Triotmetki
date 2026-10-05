import type { UiComponent, UiField } from '@/shared/api/protocol';

import type { useComponentCard, useComponentEditor } from '../model/hooks';

export type ComponentCardModel = ReturnType<typeof useComponentCard>;

export type ComponentEditorModel = ReturnType<typeof useComponentEditor>;

export type ComponentCardProps = {
  component: UiComponent;
  fields?: UiField[];
};
