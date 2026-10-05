import type { EditorSectionProps } from './EditorSection.types';

import { EditorLine } from '../EditorLine';

import s from './EditorSection.module.scss';

export const EditorSection = ({ group, onSet, onHint }: EditorSectionProps) => (
  <div aria-label={group.label} className={s.section} role='group'>
    <span className={s.title}>{group.label}</span>
    {group.rows.map((row) => (
      <EditorLine key={row.field.key} row={row} onHint={onHint} onSet={onSet} />
    ))}
  </div>
);
