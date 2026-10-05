import { useStore } from '@nanostores/react';

import type { SettingInput } from '@/entities/window/window-state';

import { $state, changedFields, changeSetting, componentIcon, isEnabled, openSetting, resetComponent } from '@/entities/window/window-state';
import { send } from '@/shared/api/protocol';

import type { UseComponentCardInput } from './use-component-card.types';

import { CONTEXT_BADGES } from '../../../config';
import { panelPreview } from '../../../lib/card-layout';
import { cardPreviewKind, cardSummary, carouselPreview } from '../../../lib/card-preview';
import { useCardActions } from '../use-card-actions';

export const useComponentCard = ({ component, fields }: UseComponentCardInput) => {
  const state = useStore($state);
  const actions = useCardActions(component);
  const hasListPage = component.page?.kind === 'list';

  return {
    ...actions,
    icon: componentIcon(component.id),
    enabled: isEnabled(component),
    badges: CONTEXT_BADGES[component.context],
    changedCount: changedFields(component).length,
    preview: panelPreview({ component, panels: state?.hud.panels ?? [] }),
    previewKind: cardPreviewKind(component),
    carousel: carouselPreview(component.fields),
    summary: cardSummary(component.fields),
    thumb: component.thumb ?? null,
    hasListPage,
    showEmpty: component.fields.length === 0 && component.actions.length === 0 && !hasListPage,
    open: () => openSetting({ componentId: component.id, key: fields?.[0]?.key ?? null }),
    reset: () => resetComponent(component),
    moveOnScreen: () => send({ type: 'hud_edit', active: true }),
    setField: ({ key, value }: SettingInput) => changeSetting({ component, key, value })
  };
};
