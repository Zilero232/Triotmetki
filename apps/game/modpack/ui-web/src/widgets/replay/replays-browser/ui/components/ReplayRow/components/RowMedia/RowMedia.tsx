import type { RowPartProps } from '../../ReplayRow.types';

import s from './RowMedia.module.scss';

export const RowMedia = ({ item }: RowPartProps) => (
  <span className={s.media}>
    {item.map_thumb ? <img alt='' className={s.map} src={item.map_thumb} /> : <span className={s.mapEmpty} />}
    {item.tank_image && <img alt='' className={s.tank} src={item.tank_image} />}
  </span>
);
