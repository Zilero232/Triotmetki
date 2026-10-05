import type { EditorSectionProps } from './EditorSection.types';

import { EditorLine } from '../EditorLine';

import s from './EditorSection.module.scss';

export const EditorSection = ({ group, focusKey, lineRef, onSet, onHint }: EditorSectionProps) => (
  <div aria-label={group.label} className={s.section} role='group'>
    <span className={s.title}>{group.label}</span>
    {group.rows.map((row) => {
      const isFocused = row.field.key === focusKey;

      return <EditorLine key={row.field.key} focused={isFocused} lineRef={isFocused ? lineRef : undefined} row={row} onHint={onHint} onSet={onSet} />;
    })}
  </div>
);
