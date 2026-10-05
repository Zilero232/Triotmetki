import type { SeedByOrderInput, WriteParticipantSeedsInput } from './tournament-seeds.types';

const seedByOrder = ({ eb, accountIds }: SeedByOrderInput) => {
  const [first = 0, ...rest] = accountIds;
  let seed = eb.case().when('account_id', '=', first).then(1);

  rest.forEach((accountId, index) => {
    seed = seed.when('account_id', '=', accountId).then(index + 2);
  });

  return seed.end();
};

export const writeParticipantSeeds = ({ db, tournamentId, seededAccountIds }: WriteParticipantSeedsInput) =>
  db
    .updateTable('tournament_participant')
    .set((eb) => ({ seed: seedByOrder({ eb, accountIds: seededAccountIds }) }))
    .where('tournament_id', '=', tournamentId)
    .where('account_id', 'in', seededAccountIds)
    .execute();

export const TOURNAMENT_SEEDS_QUERIES = { writeParticipantSeeds } as const;
