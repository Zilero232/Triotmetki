import { Empty, List } from '@/ui-kit';

import type { ListPageProps } from './ListPage.types';

import { useListPage } from '../../../model/hooks';
import { GalleryTile, ListPageRow, PageNote } from './components';

import s from './ListPage.module.scss';

export const ListPage = ({ page, compact = false, onRun }: ListPageProps) => {
  const rows = useListPage({ rows: page.rows, onRun });

  if (rows.length === 0) {
    return <Empty>{page.empty}</Empty>;
  }

  if (page.layout === 'gallery') {
    return (
      <div className={s.page}>
        {page.note && <PageNote text={page.note} />}
        <div className={s.gallery} role='list'>
          {rows.map((item) => (
            <GalleryTile key={item.row.id} compact={compact} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      {page.note && <PageNote text={page.note} />}
      <List>
        {rows.map((item) => (
          <ListPageRow key={item.row.id} item={item} />
        ))}
      </List>
    </div>
  );
};
