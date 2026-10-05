import clsx from 'clsx';

import { imageStyle, textStyle } from '@/shared/lib/run-style';

import type { HudRunProps } from './HudRun.types';

import s from './HudRun.module.scss';

export const HudRun = ({ run }: HudRunProps) =>
  run.kind === 'image' ? (
    <img alt='' className={s.image} draggable={false} src={run.src} style={imageStyle(run)} />
  ) : (
    <span className={clsx(run.style.bold && s.bold, run.style.italic && s.italic, run.style.underline && s.underline)} style={textStyle(run)}>
      {run.text}
    </span>
  );
