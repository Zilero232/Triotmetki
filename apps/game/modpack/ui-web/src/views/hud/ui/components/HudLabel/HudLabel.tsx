import clsx from 'clsx';
import { memo } from 'react';

import type { HudLabelProps } from './HudLabel.types';

import { pressPanel } from '../../../lib/press-panel';
import { LabelContent } from './components';

import s from './HudLabel.module.scss';

export const HudLabel = memo(({ id, panel, lines, widget, style, button, interactive, pressable, framed, dragging, measureRef }: HudLabelProps) => (
  <button
    ref={measureRef}
    className={clsx(s.label, {
      [s.border]: panel.border,
      [s.widget]: widget !== null,
      [s.button]: button,
      [s.interactive]: interactive,
      [s.framed]: framed,
      [s.dragging]: dragging
    })}
    aria-label={id}
    disabled={!interactive}
    style={style}
    tabIndex={-1}
    type='button'
    onClick={pressable ? () => pressPanel(id) : undefined}
  >
    <LabelContent button={button} interactive={interactive} lines={lines} widget={widget} />
  </button>
));
