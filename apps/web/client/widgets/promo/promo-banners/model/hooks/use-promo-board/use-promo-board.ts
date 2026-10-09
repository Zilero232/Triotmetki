'use client';

import type { PromoId } from '../../../config';

import { PROMO_BOARD, PROMO_CAROUSEL, PROMO_ITEMS } from '../../../config';
import { resolvePromos } from '../../../lib/resolve-promos';
import { usePromoSources } from '../use-promo-sources';

export const usePromoBoard = () => {
  const { isModpackPublished, tanks } = usePromoSources();

  const resolve = (ids: readonly PromoId[]) => resolvePromos({ ids, specs: PROMO_ITEMS, isModpackPublished, tanks });

  return {
    hero: resolve(PROMO_BOARD.hero),
    tiles: PROMO_BOARD.tiles.map((ids, index) => ({
      key: ids.join('-'),
      items: resolve(ids),
      delay: PROMO_CAROUSEL.tileDelay + index * PROMO_CAROUSEL.tileStagger
    }))
  };
};
