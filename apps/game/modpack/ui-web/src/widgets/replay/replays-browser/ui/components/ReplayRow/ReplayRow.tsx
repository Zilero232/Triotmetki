import clsx from 'clsx';

import { rem } from '@/shared/lib/css-unit';

import type { ReplayRowProps } from './ReplayRow.types';

import { RowMain, RowMarks, RowMedia, RowNumbers } from './components';

import s from './ReplayRow.module.scss';

export const ReplayRow = ({ item, top, height, selected, onSelect }: ReplayRowProps) => (
  <button
    aria-pressed={selected}
    className={clsx(s.row, selected && s.rowOn)}
    style={{ top: rem(top), height: rem(height) }}
    type='button'
    onClick={() => onSelect(item.id)}
  >
    <span className={clsx(s.stripe, item.result && s[item.result])} />
    <RowMedia item={item} />
    <RowMain item={item} />
    <RowNumbers item={item} />
    <RowMarks item={item} />
  </button>
);
