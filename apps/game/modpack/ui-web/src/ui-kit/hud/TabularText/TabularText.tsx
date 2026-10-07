import clsx from 'clsx';

import { rem } from '@/shared/lib/css-unit';
import { figureChunks } from '@/shared/lib/figure-chunks';

import type { TabularTextProps } from './TabularText.types';

import s from './TabularText.module.scss';

export const TabularText = ({ text, digitWidth, className, style }: TabularTextProps) => {
  const digitStyle = digitWidth === undefined ? undefined : { width: rem(digitWidth) };

  return (
    <span className={clsx(s.root, className)} style={style}>
      {figureChunks(text).map((chunk) => (
        <span key={chunk.key} className={chunk.digit ? s.digit : s.char} style={chunk.digit ? digitStyle : undefined}>
          {chunk.text}
        </span>
      ))}
    </span>
  );
};
