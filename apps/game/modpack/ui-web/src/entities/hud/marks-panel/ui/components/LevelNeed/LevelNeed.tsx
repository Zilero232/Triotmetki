import clsx from 'clsx';

import { Glyph } from '@/ui-kit';

import type { LevelNeedProps } from './LevelNeed.types';

import { MARKS_PANEL } from '../../../config';

import s from './LevelNeed.module.scss';

export const LevelNeed = ({ level, needClassName }: LevelNeedProps) => (
  <span className={s.item}>
    <span className={s.level}>{level.label}</span>
    <Glyph className={clsx(!level.reached && s.idle)} name={MARKS_PANEL.checkGlyph} size={MARKS_PANEL.checkSize} tone='good' />
    {!level.reached && <span className={clsx(s.need, needClassName)}>{level.value}</span>}
  </span>
);
