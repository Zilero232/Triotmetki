import { Icon } from '@/ui-kit';

import type { WindowFrameProps } from './WindowFrame.types';

import s from './WindowFrame.module.scss';

export const WindowFrame = ({ frame, label, children }: WindowFrameProps) => (
  <div aria-label={label} className={s.frame} role='dialog' style={frame.frameStyle}>
    <div className={s.inner} style={frame.innerStyle}>
      {children}
    </div>
    <div ref={frame.handles.right} aria-hidden='true' className={s.edgeRight} />
    <div ref={frame.handles.bottom} aria-hidden='true' className={s.edgeBottom} />
    <div ref={frame.handles.corner} aria-hidden='true' className={s.grip}>
      <Icon name='move-diagonal-2' size={12} />
    </div>
  </div>
);
