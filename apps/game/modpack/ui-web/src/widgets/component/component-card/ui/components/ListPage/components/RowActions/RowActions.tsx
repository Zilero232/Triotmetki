import { useT } from '@/entities/window/window-state';
import { ListItemActions, ListItemButton } from '@/ui-kit';

import type { RowActionsProps } from './RowActions.types';

export const RowActions = ({ item }: RowActionsProps) => {
  const t = useT();

  return (
    <ListItemActions>
      {item.hasDetails && (
        <ListItemButton aria-expanded={item.detailsOpen} size='small' variant='ghost' onClick={item.toggleDetails}>
          {item.detailsOpen ? t('hideDetails') : t('details')}
        </ListItemButton>
      )}
      {item.actions.map((action) => (
        <ListItemButton key={action.id} size='small' onClick={action.onClick}>
          {action.label}
        </ListItemButton>
      ))}
    </ListItemActions>
  );
};
