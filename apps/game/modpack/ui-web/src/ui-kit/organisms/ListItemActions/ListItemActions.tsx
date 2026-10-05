import type { ListItemActionsProps } from './ListItemActions.types';

import s from './ListItemActions.module.scss';

export const ListItemActions = ({ children }: ListItemActionsProps) => <div className={s.actions}>{children}</div>;
