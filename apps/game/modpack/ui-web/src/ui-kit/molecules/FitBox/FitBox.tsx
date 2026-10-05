import clsx from 'clsx';

import { useFitScale } from '@/shared/lib/use-fit-scale';

import type { FitBoxProps } from './FitBox.types';

import s from './FitBox.module.scss';

export const FitBox = ({ className, children }: FitBoxProps) => {
  const fit = useFitScale();

  return (
    <div ref={fit.frameRef} className={clsx(s.frame, className)}>
      <div ref={fit.contentRef} className={s.content} style={{ transform: `scale(${fit.scale})` }}>
        {children}
      </div>
    </div>
  );
};
