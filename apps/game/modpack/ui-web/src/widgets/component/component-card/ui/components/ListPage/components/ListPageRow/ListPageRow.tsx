import { Badge, ListItem, ListItemMain, ListItemNote } from '@/ui-kit';

import type { ListPageRowProps } from './ListPageRow.types';

import { RowActions } from '../RowActions';
import { RowDetails } from '../RowDetails';
import { RowDraftEditor } from '../RowDraftEditor';

export const ListPageRow = ({ item }: ListPageRowProps) => {
  const { row } = item;

  return (
    <ListItem>
      <ListItemMain badge={row.badge && <Badge>{row.badge}</Badge>} title={row.title}>
        {row.subtitle && <ListItemNote>{row.subtitle}</ListItemNote>}
        {row.meta && <ListItemNote>{row.meta}</ListItemNote>}
        {item.detailsOpen && <RowDetails row={row} />}
      </ListItemMain>
      {item.draftValue === null ? <RowActions item={item} /> : <RowDraftEditor draftValue={item.draftValue} item={item} />}
    </ListItem>
  );
};
