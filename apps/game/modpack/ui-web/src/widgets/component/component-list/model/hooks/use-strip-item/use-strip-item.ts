import type { UiComponent } from '@/shared/api/protocol';

import { componentIcon, isEnabled, openEditor, toggleSwitch } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';

export const useStripItem = (component: UiComponent) => ({
  icon: componentIcon(component.id),
  enabled: isEnabled(component),
  tip: useTooltip(component.hint ?? undefined),
  open: () => openEditor(component.id),
  toggle: () => toggleSwitch(component)
});
