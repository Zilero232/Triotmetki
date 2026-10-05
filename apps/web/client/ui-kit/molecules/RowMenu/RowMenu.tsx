'use client';

import { Ellipsis } from 'lucide-react';

import type { RowMenuProps } from './RowMenu.types';

import { IconButton } from '../../atoms/IconButton';
import { Popover } from '../Popover';

import s from './RowMenu.module.scss';

export const RowMenu = ({ label, title, children }: RowMenuProps) => (
  <Popover
    trigger={
      <IconButton aria-label={label} size='sm' title={label}>
        <Ellipsis aria-hidden size={16} />
      </IconButton>
    }
    align='end'
    className={s.popup}
    side='bottom'
    title={title}
  >
    <div className={s.actions}>{children}</div>
  </Popover>
);
