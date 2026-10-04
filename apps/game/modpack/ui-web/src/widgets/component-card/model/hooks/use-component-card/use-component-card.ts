import { useStore } from '@nanostores/react';

import type { SettingInput } from '../../../../../entities/window-state';
import type { StringKey } from '../../../../../shared/i18n';
import type { UseComponentCardInput } from './use-component-card.types';

import {
  $state,
  $view,
  changedFields,
  changeSetting,
  componentIcon,
  isEnabled,
  openEditor,
  resetComponent,
  toggleExpanded,
  toggleSwitch
} from '../../../../../entities/window-state';
import { send } from '../../../../../shared/api/protocol';
import { CONTEXT_BADGES } from '../../../config';
import { cardLayout, panelPreview } from '../../../lib/card-layout';
import { cardPreviewKind, cardSummary, carouselPreview } from '../../../lib/card-preview';
import { useCardActions } from '../use-card-actions';

export const useComponentCard = ({ component, fields, forceOpen = false }: UseComponentCardInput) => {
  const view = useStore($view);
  const state = useStore($state);
  const actions = useCardActions(component);
  const layout = cardLayout({ component, fields, isExpanded: view.expanded.includes(component.id), forceOpen });
  const switchLabelKey: StringKey = component.switch?.value ? 'on' : 'off';

  return {
    ...layout,
    ...actions,
    icon: componentIcon(component.id),
    enabled: isEnabled(component),
    badges: CONTEXT_BADGES[component.context],
    changedCount: changedFields(component).length,
    switchLabelKey,
    preview: panelPreview({ component, panels: state?.hud.panels ?? [] }),
    previewKind: cardPreviewKind(component),
    carousel: carouselPreview(component.fields),
    summary: cardSummary(component.fields),
    thumb: component.thumb ?? null,
    gallery: component.gallery ?? {},
    showAdvanced: forceOpen,
    toggle: () => toggleSwitch(component),
    hasEditor: Boolean(component.editor),
    openEditor: () => openEditor(component.id),
    toggleOpen: () => {
      if (component.editor) {
        openEditor(component.id);

        return;
      }

      if (layout.expandable && !forceOpen) {
        toggleExpanded(component.id);
      }
    },
    reset: () => resetComponent(component),
    moveOnScreen: () => send({ type: 'hud_edit', active: true }),
    setField: ({ key, value }: SettingInput) => changeSetting({ component, key, value })
  };
};
