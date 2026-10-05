import { useT } from '@/entities/window/window-state';
import { IconButton } from '@/ui-kit';

import type { ZoomControlProps } from './ZoomControl.types';

import s from './ZoomControl.module.scss';

export const ZoomControl = ({ frame }: ZoomControlProps) => {
  const t = useT();

  return (
    <div aria-label={t('zoomLabel')} className={s.zoom} role='group'>
      <IconButton disabled={!frame.canZoomOut} icon='zoom-out' label={t('zoomOut')} size='small' variant='ghost' onClick={frame.zoomOut} />
      <span className={s.value}>{`${frame.zoom}%`}</span>
      <IconButton disabled={!frame.canZoomIn} icon='zoom-in' label={t('zoomIn')} size='small' variant='ghost' onClick={frame.zoomIn} />
    </div>
  );
};
