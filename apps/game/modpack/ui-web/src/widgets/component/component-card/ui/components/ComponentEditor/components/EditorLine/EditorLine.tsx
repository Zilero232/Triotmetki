import clsx from 'clsx';

import { isChanged } from '@/entities/window/window-state';

import type { EditorLineProps } from './EditorLine.types';

import { EditorControl } from '../EditorControl';

import s from './EditorLine.module.scss';

export const EditorLine = ({ row, onSet, onHint }: EditorLineProps) => {
  const { field } = row;
  const isStacked = field.type === 'choice' && row.kind !== 'swatches';

  return (
    <div className={clsx(s.line, isStacked && s.stacked)} onMouseEnter={() => onHint({ label: field.label, text: field.hint })}>
      <span className={clsx(s.label, isStacked && s.labelStacked)}>
        <span className={clsx(s.dot, isChanged(field) && s.dotOn)} />
        {field.label}
      </span>
      <div className={clsx(s.control, isStacked && s.controlStacked)}>
        <EditorControl row={row} onHint={onHint} onSet={onSet} />
      </div>
    </div>
  );
};
