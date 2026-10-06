import clsx from 'clsx';

import { useFitScale } from '@/shared/lib/use-fit-scale';

import type { FitBoxProps } from './FitBox.types';

import s from './FitBox.module.scss';

export const FitBox = ({ className, contentKey, max, minScale = 0, fallback, children }: FitBoxProps) => {
  const fit = useFitScale({ contentKey, max });
  const isTooSmall = fallback !== undefined && fit.measured && fit.scale < minScale;

  return (
    <div ref={fit.frameRef} className={clsx(s.frame, className)}>
      <div
        ref={fit.contentRef}
        className={s.content}
        style={{ opacity: fit.measured && !isTooSmall ? 1 : 0, transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})` }}
      >
        {children}
      </div>
      {isTooSmall && <div className={s.fallback}>{fallback}</div>}
    </div>
  );
};
