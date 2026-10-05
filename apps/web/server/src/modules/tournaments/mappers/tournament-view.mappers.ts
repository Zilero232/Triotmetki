import type { TournamentView } from '../tournaments.types';
import type { TournamentViewInput } from './tournament-view.types';

import { toIso } from '../../../common/lib';
import { readRequirements } from '../../community-core';

export const toTournamentView = ({ tournament, nicknames, bracket, maxParticipants }: TournamentViewInput): TournamentView => ({
  id: tournament.id,
  slug: tournament.slug,
  title: tournament.title,
  description: tournament.description,
  requirements: readRequirements(tournament.requirements),
  maxParticipants,
  bracket,
  status: tournament.status,
  organizerUserId: tournament.organizerUserId,
  registrationEndsAt: toIso(tournament.registrationEndsAt),
  startsAt: tournament.startsAt.toISOString(),
  participants: tournament.participants.map((participant) => ({
    accountId: Number(participant.accountId),
    nickname: nicknames.get(participant.accountId) ?? null,
    teamName: participant.teamName,
    seed: participant.seed,
    verified: participant.verified
  }))
});
