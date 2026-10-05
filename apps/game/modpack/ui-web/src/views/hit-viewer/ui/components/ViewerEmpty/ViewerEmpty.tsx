import { Button, Empty } from '@/ui-kit';

import type { ViewerEmptyProps } from './ViewerEmpty.types';

import s from './ViewerEmpty.module.scss';

export const ViewerEmpty = ({ labels, onClose }: ViewerEmptyProps) => (
  <div className={s.card}>
    <span className={s.title}>{labels.no_battles_title}</span>
    <Empty>{labels.no_battles}</Empty>
    <Button variant='accent' onClick={onClose}>
      {labels.close}
    </Button>
  </div>
);
