import clsx from 'clsx';

import { isChanged } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';

import type { FieldProps } from './Field.types';

import { FieldControl } from '../FieldControl';

import s from './Field.module.scss';

export const Field = ({ field, gallery, onSet }: FieldProps) => {
  const tip = useTooltip(field.hint ?? undefined);
  const isStacked = Boolean(gallery);

  return (
    <div className={clsx(s.field, isStacked && s.stacked)}>
      <div className={s.text} {...tip}>
        <span className={s.labelRow}>
          <span className={clsx(s.dot, isChanged(field) && s.dotOn)} />
          <span className={s.label}>{field.label}</span>
        </span>
        {field.hint && <span className={s.hint}>{field.hint}</span>}
      </div>
      <div className={clsx(s.control, isStacked && s.controlStacked)}>
        <FieldControl field={field} gallery={gallery} onSet={onSet} />
      </div>
    </div>
  );
};
