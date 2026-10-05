import type { TankObtain } from '@otmetki/schemas';

import type { NewsItem } from '../../../../generated';

export type TankOfferView = TankObtain['offers']['items'][number];

export type TankNewsLink = TankObtain['news'][number];

export type TankNewsRow = Pick<NewsItem, 'publishedAt' | 'title' | 'url'>;
