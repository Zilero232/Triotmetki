import clsx from 'clsx';

import { Icon } from '@/ui-kit';

import type { HudPanelProps } from './HudPanel.types';

import { HUD_EDITOR } from '../../../config';
import { useHudPanel } from '../../../model/hooks';

import s from './HudPanel.module.scss';

export const HudPanel = ({ item }: HudPanelProps) => {
  const pointer = useHudPanel(item);
  const { panel, fit } = item;

  return (
    <button
      className={clsx(
        s.panel,
        fit === 'label' ? s.fitLabel : s.fitCentre,
        item.active && s.panelActive,
        !panel.enabled && s.panelOff,
        !panel.enabled && item.active && s.panelOffActive
      )}
      aria-label={panel.title}
      aria-pressed={item.selected}
      style={item.style}
      title={pointer.title}
      type='button'
      onKeyDown={item.onKeyDown}
      onMouseDown={pointer.onMouseDown}
      onMouseEnter={pointer.onMouseEnter}
      onMouseLeave={pointer.onMouseLeave}
    >
      {fit !== 'bare' && <Icon className={s.icon} name={item.icon} size={HUD_EDITOR.iconSize} tone={item.tone} />}
      {fit === 'label' && <span className={clsx(s.label, item.active && s.labelActive, !panel.enabled && s.labelOff)}>{panel.title}</span>}
    </button>
  );
};
