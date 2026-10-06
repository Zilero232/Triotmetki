import { useRef } from 'react';
import { isDeepEqual } from 'remeda';

import type { LabelLayout, LabelStyle } from '../../../lib/label-layout';
import type { HudLabelModel, UseLabelModelsInput } from './use-label-models.types';

export const useLabelModels = ({ layouts, lines, widgets, liveId, measureRef }: UseLabelModelsInput): HudLabelModel[] => {
  const stylesRef = useRef(new Map<string, LabelStyle>());

  const stableStyle = ({ id, style }: LabelLayout): LabelStyle => {
    const known = stylesRef.current.get(id);

    if (known && isDeepEqual(known, style)) {
      return known;
    }

    stylesRef.current.set(id, style);

    return style;
  };

  const labelOf = (layout: LabelLayout): HudLabelModel => {
    const { panel, id, button, movable, pointer } = layout;

    return {
      id,
      panel,
      lines: lines.get(id) ?? null,
      widget: widgets.get(id) ?? null,
      style: stableStyle(layout),
      button,
      interactive: button || movable || pointer,
      pressable: button && !movable,
      framed: movable,
      dragging: liveId === id,
      measureRef: measureRef(id)
    };
  };

  return layouts.map(labelOf);
};
