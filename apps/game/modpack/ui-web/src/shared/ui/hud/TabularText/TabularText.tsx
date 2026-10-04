import clsx from 'clsx';

import type { TabularTextProps } from './TabularText.types';

import { figureChunks } from '../../../lib/hud-figures';

import s from './TabularText.module.scss';

export const TabularText = ({ text, className, style }: TabularTextProps) => (
  <span className={clsx(s.root, className)} style={style}>
    {figureChunks(text).map((chunk) => (
      <span key={chunk.key} className={chunk.digit ? s.digit : s.char}>
        {chunk.text}
      </span>
    ))}
  </span>
);
