import type { UiComponent } from '@/shared/api/protocol';

import { toggleSwitch, useT } from '@/entities/window/window-state';

export const useCardSwitch = (component: UiComponent) => {
  const t = useT();

  return { label: t(component.switch?.value ? 'on' : 'off'), toggle: () => toggleSwitch(component) };
};
