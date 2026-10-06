import type { CatalogComponent } from '@/entities/catalog';

import type { Selection } from '../../../lib';

export type UseLoadProfileInput = {
  components: readonly CatalogComponent[];
  onLoaded: (selection: Selection) => void;
};
