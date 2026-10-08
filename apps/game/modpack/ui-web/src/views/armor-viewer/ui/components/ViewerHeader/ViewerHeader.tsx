import { IconButton } from '@/ui-kit';

import type { ViewerHeaderProps } from './ViewerHeader.types';

import { tierLabel } from '../../../lib/fill-label';

import s from './ViewerHeader.module.scss';

export const ViewerHeader = ({ labels, tank, onClose }: ViewerHeaderProps) => (
  <div className={s.header}>
    <IconButton icon='x' label={labels.close ?? ''} variant='ghost' onClick={onClose} />
    <div className={s.titles}>
      <span className={s.title}>{labels.title}</span>
      {tank && (
        <span className={s.tank}>
          <span className={s.tier}>{tierLabel(tank.tier)}</span>
          {tank.name}
        </span>
      )}
    </div>
  </div>
);
