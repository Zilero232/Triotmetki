import clsx from 'clsx';

import { useScrollArea } from '@/shared/lib/use-scroll-area';

import type { ScrollAreaProps } from './ScrollArea.types';

import s from './ScrollArea.module.scss';

export const ScrollArea = ({ className, contentClassName, label, initialTop, contain, onScrollEnd, onMetrics, children }: ScrollAreaProps) => {
  const area = useScrollArea({ initialTop, contain, onScrollEnd, onMetrics });

  return (
    <div className={clsx(s.area, className)}>
      <div ref={area.viewportRef} aria-label={label} className={s.viewport} role={label ? 'region' : undefined}>
        <div className={clsx(s.content, contentClassName)}>{children}</div>
      </div>
      {area.thumb.visible && (
        <div aria-hidden='true' className={s.track}>
          <div ref={area.thumbRef} className={s.thumb} style={area.thumbStyle} />
        </div>
      )}
    </div>
  );
};
