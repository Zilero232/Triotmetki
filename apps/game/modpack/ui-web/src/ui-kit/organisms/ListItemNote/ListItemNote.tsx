import type { ListItemNoteProps } from './ListItemNote.types';

import s from './ListItemNote.module.scss';

export const ListItemNote = ({ children }: ListItemNoteProps) => <span className={s.note}>{children}</span>;
