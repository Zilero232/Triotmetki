import { match } from 'ts-pattern';

import { Toggle } from '@/ui-kit';

import type { FieldControlProps } from './FieldControl.types';

import { IntField, TextField } from '../components';

export const FieldControl = ({ field, onSet }: FieldControlProps) =>
  match(field)
    .with({ type: 'bool' }, (bool) => <Toggle label={bool.label} on={bool.value} onToggle={() => onSet({ key: bool.key, value: !bool.value })} />)
    .with({ type: 'int' }, (int) => <IntField field={int} onSet={onSet} />)
    .with({ type: 'text' }, (text) => <TextField field={text} onSet={onSet} />)
    .exhaustive();
