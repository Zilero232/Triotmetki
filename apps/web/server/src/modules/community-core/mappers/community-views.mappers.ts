import type { Author } from '@otmetki/schemas';

import type { AccountRating } from '../../../../generated';
import type { PlayerStats } from '../lib/requirements/requirements.types';
import type { AuthorUser } from './community-views.types';

export const toAuthorView = (user: AuthorUser): Author => ({
  id: user.id,
  name: user.name,
  image: user.image && /^https?:\/\//.test(user.image) ? user.image : null
});

export const toPlayerStats = (rating: Pick<AccountRating, 'battles' | 'winRate' | 'wn8'> | null | undefined): PlayerStats | null =>
  rating ? { battles: rating.battles, wn8: rating.wn8, winRate: rating.winRate } : null;
