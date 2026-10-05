import type { ButtonProps } from '../../atoms/Button';

import { Button } from '../../atoms/Button';

import s from './ListItemButton.module.scss';

export const ListItemButton = (props: ButtonProps) => <Button className={s.control} {...props} />;
