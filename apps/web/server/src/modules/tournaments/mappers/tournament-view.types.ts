import type { NamesById } from '../../community-core';
import type { Bracket } from '../lib/bracket/bracket.types';
import type { TournamentWithParticipants } from '../selects/tournament.types';

export type TournamentViewInput = {
  tournament: TournamentWithParticipants;
  nicknames: NamesById;
  bracket: Bracket | null;
  maxParticipants: number;
};
