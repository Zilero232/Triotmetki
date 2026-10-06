import { useStore } from '@nanostores/react';

import type { UiComponent } from '@/shared/api/protocol';

import { $components, openEditor, toggleSwitch, useT } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';

export const useCardSwitch = (component: UiComponent) => {
  const t = useT();
  const owner = useStore($components).find(({ id }) => id === component.owner) ?? null;
  const ownerTip = useTooltip(owner ? `${t('switchOwnerHint')} «${owner.title}»` : undefined);

  return {
    label: t(component.switch?.value ? 'on' : 'off'),
    toggle: () => toggleSwitch(component),
    owner: owner ? { title: owner.title, open: () => openEditor(owner.id), tip: ownerTip } : null
  };
};
