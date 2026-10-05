import { Icon } from '@/ui-kit';

import type { PageNoteProps } from './PageNote.types';

import s from './PageNote.module.scss';

export const PageNote = ({ text }: PageNoteProps) => (
  <p className={s.note}>
    <Icon className={s.icon} name='info' size={16} tone='accent' />
    <span className={s.text}>{text}</span>
  </p>
);
