import type { RowPartProps } from '../../ReplayRow.types';

import { ReplayIcon } from '../../../ReplayIcon';
import { SiteState } from '../../../SiteState';

import s from './RowMarks.module.scss';

export const RowMarks = ({ item }: RowPartProps) => (
  <span className={s.marks}>
    {item.site && <SiteState size='row' state={item.site.state} />}
    {!item.playable && <span className={s.version}>{item.version ?? '?'}</span>}
    {item.favourite && <ReplayIcon className={s.star} name='star' size={14} />}
  </span>
);
