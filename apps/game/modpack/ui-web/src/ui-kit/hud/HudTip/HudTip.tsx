import clsx from 'clsx';

import type { HudTipProps } from './HudTip.types';

import s from './HudTip.module.scss';

export const HudTip = ({ title, text, mark, className }: HudTipProps) => (
  <div className={clsx(s.tip, className)}>
    {title && (
      <div className={s.head}>
        {mark && <span className={s.mark}>{mark}</span>}
        <span className={s.title}>{title}</span>
      </div>
    )}
    {text && <span className={clsx(s.text, title && s.below)}>{text}</span>}
  </div>
);
