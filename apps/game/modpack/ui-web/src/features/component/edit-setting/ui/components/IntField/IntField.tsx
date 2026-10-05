import { useT } from '@/entities/window/window-state';
import { IconButton, Input } from '@/ui-kit';

import type { IntFieldProps } from './IntField.types';

import { useIntField } from '../../../model/hooks';

import s from './IntField.module.scss';

export const IntField = ({ field, onSet }: IntFieldProps) => {
  const t = useT();
  const control = useIntField({ value: field.value, min: field.min, max: field.max, onCommit: (value) => onSet({ key: field.key, value }) });

  return (
    <div aria-label={field.label} className={s.stepper} role='group'>
      {control.range && <span className={s.range}>{control.range}</span>}
      <IconButton disabled={!control.canDecrease} icon='minus' label={t('decrease')} size='small' onClick={control.decrease} />
      <Input
        aria-label={field.label}
        className={s.value}
        inputMode='numeric'
        value={control.text}
        onBlur={control.commit}
        onChange={(event) => control.edit(event.currentTarget.value)}
        onKeyDown={(event) => control.onKey(event.key)}
      />
      <IconButton disabled={!control.canIncrease} icon='plus' label={t('increase')} size='small' onClick={control.increase} />
    </div>
  );
};
