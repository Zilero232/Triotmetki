import type { AccountRating, PlayerTank, Vehicle } from '../../../../../generated';
import type { ProfileCardRow } from '../selects/profile-card.types';

type FavouriteTankRow = Pick<PlayerTank, 'battles' | 'tankId'>;

export type ToStreamerCardInput = {
  profile: ProfileCardRow;
  rating: AccountRating | undefined;
  marks3: number | null;
  favourites: readonly FavouriteTankRow[];
  vehicles: Readonly<Record<string, Pick<Vehicle, 'name' | 'tankId'>>>;
};
