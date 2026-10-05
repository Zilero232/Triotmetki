import type { UiComponent } from '@/shared/api/protocol';

import type { ComponentEditorModel } from '../../../../ComponentCard.types';

export type EditorStageProps = {
  component: UiComponent;
  model: ComponentEditorModel;
  compact: boolean;
};
