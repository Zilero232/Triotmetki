import { Mountain } from 'lucide-react';

import type { HangarLooksNoteProps } from './HangarLooksNote.types';

import { useHangarLooksNote } from '../../../model/hooks';

import s from './HangarLooksNote.module.scss';

export const HangarLooksNote = ({ clientPath }: HangarLooksNoteProps) => {
  const note = useHangarLooksNote(clientPath);

  if (note === null) {
    return null;
  }

  return (
    <p className={s.root} data-failed={note.isFailed}>
      <Mountain aria-hidden className={s.icon} />
      <span className={s.lines}>
        {note.built && <span>{note.built}</span>}
        {note.skipped && <span className={s.skipped}>{note.skipped}</span>}
      </span>
    </p>
  );
};
