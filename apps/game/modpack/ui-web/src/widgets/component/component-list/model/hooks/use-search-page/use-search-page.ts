import { useStore } from '@nanostores/react';

import { $hits, $query } from '@/entities/window/window-state';

import { splitColumns } from '../../../lib/columns';

export const useSearchPage = (columns: number) => {
  const hits = useStore($hits);
  const query = useStore($query);

  return { query, empty: hits.length === 0, columns: splitColumns({ items: hits, columns }) };
};
