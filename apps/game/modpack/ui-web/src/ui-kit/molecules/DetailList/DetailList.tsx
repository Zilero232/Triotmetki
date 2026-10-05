import type { DetailListProps } from './DetailList.types';

import s from './DetailList.module.scss';

export const DetailList = ({ items }: DetailListProps) => (
  <div className={s.details}>
    {items.map((item) => (
      <div key={`${item.label}|${item.value}`} className={s.detail}>
        {item.label && <span className={s.label}>{item.label}</span>}
        <span className={s.value}>{item.value}</span>
      </div>
    ))}
  </div>
);
