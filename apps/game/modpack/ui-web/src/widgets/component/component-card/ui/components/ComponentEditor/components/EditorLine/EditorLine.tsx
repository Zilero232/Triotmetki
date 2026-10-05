import clsx from 'clsx';

import { isChanged } from '@/entities/window/window-state';

import type { EditorLineProps } from './EditorLine.types';

import { EditorControl } from '../EditorControl';

import s from './EditorLine.module.scss';

export const EditorLine = ({ row, focused = false, lineRef, onSet, onHint }: EditorLineProps) => {
  const { field } = row;

  return (
    <div
      ref={lineRef}
      className={clsx(s.line, row.stacked && s.stacked, focused && s.focused)}
      onMouseEnter={() => onHint({ label: field.label, text: field.hint })}
    >
      <span className={clsx(s.label, row.stacked && s.labelStacked)}>
        <span className={clsx(s.dot, isChanged(field) && s.dotOn)} />
        <span className={s.labelText}>{field.label}</span>
      </span>
      <div className={clsx(s.control, row.stacked && s.controlStacked)}>
        <EditorControl row={row} onHint={onHint} onSet={onSet} />
      </div>
    </div>
  );
};
