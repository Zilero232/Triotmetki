import type { InputProps } from '../../atoms/Input';

import { Input } from '../../atoms/Input';

import s from './ListItemInput.module.scss';

export const ListItemInput = (props: InputProps) => <Input className={s.control} {...props} />;
