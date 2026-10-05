import clsx from 'clsx';

import type { RowFigureProps } from './RowFigure.types';

import { useRowFigure } from '../../../../../model/hooks';

import s from './RowFigure.module.scss';

export const RowFigure = ({ figure }: RowFigureProps) => {
  const { shapes, marks } = useRowFigure(figure);

  return (
    <div aria-hidden className={s.figure}>
      {shapes.map((shape) => (
        <div key={shape.key} className={s.shape} style={shape.style} />
      ))}
      {marks.map((mark) => (
        <div key={mark.key} className={clsx(s.mark, s[mark.tone])} style={mark.style} />
      ))}
    </div>
  );
};
