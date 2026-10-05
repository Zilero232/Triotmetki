import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { HudSample } from '@/features/hud/widget-registry';

import type { HudPanelProps } from './HudPanel.types';

import s from './HudPanel.module.scss';

export const HudPanel = ({ item }: HudPanelProps) => {
  const t = useT();
  const { panel } = item;

  return (
    <button
      aria-label={panel.title}
      aria-pressed={item.selected}
      className={clsx(s.panel, item.selected && s.panelOn, !panel.enabled && s.panelOff)}
      style={item.style}
      type='button'
      onKeyDown={item.onKeyDown}
      onMouseDown={item.onMouseDown}
    >
      <span className={s.panelTitle}>{panel.title}</span>
      {panel.enabled ? (
        <HudSample className={s.panelSample} text={panel.text ?? panel.preview} widget={panel.widget} />
      ) : (
        <span className={s.panelOffNote}>{t('hudDisabled')}</span>
      )}
    </button>
  );
};
