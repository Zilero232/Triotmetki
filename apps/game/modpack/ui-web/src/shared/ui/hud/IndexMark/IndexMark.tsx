import clsx from 'clsx';

import type { BarClassInput, IndexMarkProps } from './IndexMark.types';

import { HUD_INDEX } from '../../../config';

import s from './IndexMark.module.scss';

const barClass = ({ index, lit, muted }: BarClassInput): string | undefined => {
  if (muted) {
    return s.dim;
  }

  return lit === undefined || index < lit ? s.lit : s.off;
};

export const IndexMark = ({ lit, muted = false, className }: IndexMarkProps) => (
  <span aria-hidden='true' className={clsx(s.mark, className)}>
    {HUD_INDEX.bars.map((index) => (
      <span key={index} className={clsx(s.bar, barClass({ index, lit, muted }))} />
    ))}
  </span>
);
