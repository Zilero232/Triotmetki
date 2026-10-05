import type { ClanMatchRow, MapMatchRow, PlayerMatchRow, SearchTermsInput, TankMatchRow, TermPatternsInput } from './search.types';

import { escapeLike, RATING_PERIOD_SQL } from '../../../common/lib';
import { trigramSimilar, valuesTable } from '../../../core';
import { SEARCH_MATCH } from '../config/search.constants';

const termPatterns = ({ db, terms, pattern }: TermPatternsInput) =>
  db.selectFrom(
    valuesTable({
      rows: terms.map((term) => ({ term, pattern: pattern(escapeLike(term)) })),
      alias: 'q',
      types: { term: 'text', pattern: 'text' }
    })
  );

const prefixPattern = (term: string) => `${term}%`;

const anywherePattern = (term: string) => `%${term}%`;

const matchingPlayers = ({ db, terms }: Omit<SearchTermsInput, 'limit'>) =>
  db
    .with('q', () => termPatterns({ db, terms, pattern: prefixPattern }).selectAll())
    .with('current_matches', (cte) =>
      cte
        .selectFrom('player')
        .innerJoin('q', (join) =>
          join.on((eb) => eb.or([eb('player.nickname', 'ilike', eb.ref('q.pattern')), trigramSimilar({ column: 'player.nickname', term: 'q.term' })]))
        )
        .where('player.is_hidden', '=', false)
        .select((eb) => [
          'player.account_id',
          eb.cast<string | null>(eb.lit(null), 'text').as('matched'),
          'q.term',
          eb.fn<number>('similarity', ['player.nickname', 'q.term']).as('score'),
          eb(eb.fn('lower', ['player.nickname']), '=', eb.fn('lower', ['q.term']))
            .$castTo<boolean>()
            .as('exact'),
          eb('player.nickname', 'ilike', eb.ref('q.pattern')).as('prefix')
        ])
    )
    .with('history_matches', (cte) =>
      cte
        .selectFrom('player_nickname_history as history')
        .innerJoin('q', (join) =>
          join.on((eb) =>
            eb.or([eb('history.nickname', 'ilike', eb.ref('q.pattern')), trigramSimilar({ column: 'history.nickname', term: 'q.term' })])
          )
        )
        .select((eb) => [
          'history.account_id',
          'history.nickname as matched',
          'q.term',
          eb(eb.fn<number>('similarity', ['history.nickname', 'q.term']), '*', eb.lit(SEARCH_MATCH.pastNicknameWeight)).as('score'),
          eb(eb.fn('lower', ['history.nickname']), '=', eb.fn('lower', ['q.term']))
            .$castTo<boolean>()
            .as('exact'),
          eb('history.nickname', 'ilike', eb.ref('q.pattern')).as('prefix')
        ])
    )
    .with('ranked', (cte) =>
      cte
        .selectFrom((eb) => eb.selectFrom('current_matches').selectAll().unionAll(eb.selectFrom('history_matches').selectAll()).as('matches'))
        .distinctOn('matches.account_id')
        .selectAll('matches')
        .orderBy('matches.account_id')
        .orderBy('matches.exact', 'desc')
        .orderBy('matches.prefix', 'desc')
        .orderBy('matches.score', 'desc')
    );

const players = async ({ db, terms, limit }: SearchTermsInput): Promise<PlayerMatchRow[]> => {
  if (terms.length === 0) {
    return [];
  }

  return matchingPlayers({ db, terms })
    .selectFrom('ranked')
    .innerJoin('player', 'player.account_id', 'ranked.account_id')
    .leftJoin('clan', 'clan.clan_id', 'player.clan_id')
    .leftJoin('account_rating', (join) =>
      join.onRef('account_rating.account_id', '=', 'player.account_id').on('account_rating.period', '=', RATING_PERIOD_SQL.overall)
    )
    .where('player.is_hidden', '=', false)
    .select((eb) => [
      'player.account_id as accountId',
      'player.nickname',
      'clan.tag as clanTag',
      eb
        .case()
        .when(eb.and([eb('ranked.matched', 'is not', null), eb('ranked.matched', '<>', eb.ref('player.nickname'))]))
        .then(eb.ref('ranked.matched'))
        .end()
        .as('matchedNickname'),
      'account_rating.wn8',
      'account_rating.battles',
      'ranked.score',
      'ranked.exact',
      'ranked.term'
    ])
    .orderBy('ranked.exact', 'desc')
    .orderBy('ranked.prefix', 'desc')
    .orderBy('ranked.score', 'desc')
    .orderBy('account_rating.battles', (order) => order.desc().nullsLast())
    .limit(limit)
    .execute();
};

const clans = async ({ db, terms, limit }: SearchTermsInput): Promise<ClanMatchRow[]> => {
  if (terms.length === 0) {
    return [];
  }

  return db
    .with('q', () => termPatterns({ db, terms, pattern: prefixPattern }).selectAll())
    .selectFrom('clan')
    .innerJoin('q', (join) =>
      join.on((eb) =>
        eb.or([
          eb('clan.tag', 'ilike', eb.ref('q.pattern')),
          eb('clan.name', 'ilike', eb.ref('q.pattern')),
          trigramSimilar({ column: 'clan.tag', term: 'q.term' }),
          trigramSimilar({ column: 'clan.name', term: 'q.term' })
        ])
      )
    )
    .where('clan.is_disbanded', '=', false)
    .groupBy('clan.clan_id')
    .select((eb) => [
      'clan.clan_id as clanId',
      'clan.tag',
      'clan.name',
      'clan.members_count as membersCount',
      'clan.emblems',
      eb.fn.max<number>(eb.fn('greatest', [eb.fn('similarity', ['clan.tag', 'q.term']), eb.fn('similarity', ['clan.name', 'q.term'])])).as('score'),
      eb.fn.agg<boolean>('bool_or', [eb(eb.fn('lower', ['clan.tag']), '=', eb.fn('lower', ['q.term']))]).as('exact')
    ])
    .orderBy('exact', 'desc')
    .orderBy('score', 'desc')
    .orderBy('clan.members_count', 'desc')
    .limit(limit)
    .execute();
};

const tanks = async ({ db, terms, limit }: SearchTermsInput): Promise<TankMatchRow[]> => {
  if (terms.length === 0) {
    return [];
  }

  return db
    .with('q', () => termPatterns({ db, terms, pattern: anywherePattern }).selectAll())
    .selectFrom('vehicle')
    .innerJoin('q', (join) =>
      join.on((eb) => {
        const shortNameWithoutDashes = eb.fn<string>('replace', ['vehicle.short_name', eb.val('-'), eb.val('')]);

        return eb.or([
          eb('vehicle.name', 'ilike', eb.ref('q.pattern')),
          eb('vehicle.short_name', 'ilike', eb.ref('q.pattern')),
          trigramSimilar({ column: 'vehicle.name', term: 'q.term' }),
          eb(shortNameWithoutDashes, 'ilike', eb.fn<string>('replace', ['q.pattern', eb.val('-'), eb.val('')]))
        ]);
      })
    )
    .where('vehicle.is_active', '=', true)
    .groupBy(['vehicle.tank_id', 'vehicle.tier'])
    .select((eb) => [
      'vehicle.tank_id as tankId',
      eb.fn
        .max<number>(
          eb.fn('greatest', [
            eb.fn('similarity', ['vehicle.name', 'q.term']),
            eb.fn('similarity', ['vehicle.short_name', 'q.term']),
            eb.fn('similarity', [
              eb.fn('replace', ['vehicle.short_name', eb.val('-'), eb.val('')]),
              eb.fn('replace', ['q.term', eb.val('-'), eb.val('')])
            ])
          ])
        )
        .as('score')
    ])
    .orderBy('score', 'desc')
    .orderBy('vehicle.tier', 'desc')
    .limit(limit)
    .execute();
};

const maps = async ({ db, terms, limit }: SearchTermsInput): Promise<MapMatchRow[]> => {
  if (terms.length === 0) {
    return [];
  }

  return db
    .with('q', () => termPatterns({ db, terms, pattern: anywherePattern }).selectAll())
    .selectFrom('arena')
    .innerJoin('q', (join) =>
      join.on((eb) => eb.or([eb('arena.name', 'ilike', eb.ref('q.pattern')), trigramSimilar({ column: 'arena.name', term: 'q.term' })]))
    )
    .where('arena.is_active', '=', true)
    .groupBy('arena.arena_id')
    .select((eb) => [
      'arena.arena_id as arenaId',
      'arena.slug',
      'arena.name',
      'arena.image',
      eb.fn.max<number>(eb.fn('similarity', ['arena.name', 'q.term'])).as('score')
    ])
    .orderBy('score', 'desc')
    .limit(limit)
    .execute();
};

export const searchQueries = { players, clans, tanks, maps } as const;
