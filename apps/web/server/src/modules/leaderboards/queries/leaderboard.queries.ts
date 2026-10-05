import { sql } from 'kysely';

import type {
  ClansBoardInput,
  LeaderboardPage,
  PageOfInput,
  PlayerRankedRow,
  PlayersBoardInput,
  RankedBoardInput,
  RisingStarsBoardInput,
  TankFiltersInput
} from './leaderboard.types';

import { RATING_PERIOD_SQL } from '../../../common/lib';
import { ACCOUNT_RATING_COLUMN, CLAN_SNAPSHOT_COLUMN, TANK_RATING_COLUMN } from '../config/columns.constants';
import { LEADERBOARD_MARKS } from '../config/marks.constants';

const pageOf = async ({ rows, total }: PageOfInput): Promise<LeaderboardPage> => {
  const [page, count] = await Promise.all([rows, total]);

  return { rows: page, total: count?.total ?? 0 };
};

const asPlayerRows = (rows: PlayerRankedRow[]) => rows.map((row) => ({ clanId: null, color: null, delta: null, ...row }));

const rankedPlayers = ({ db, query, minBattles, isStreamersOnly }: PlayersBoardInput) => {
  const value = sql.ref<number | null>(`account_rating.${ACCOUNT_RATING_COLUMN[query.metric]}`);

  return db
    .selectFrom('account_rating')
    .innerJoin('player', 'player.account_id', 'account_rating.account_id')
    .where('player.is_hidden', '=', false)
    .where('account_rating.period', '=', RATING_PERIOD_SQL[query.period])
    .where('account_rating.battles', '>=', minBattles)
    .where(value, 'is not', null)
    .$if(isStreamersOnly, (builder) =>
      builder.where('account_rating.account_id', 'in', (eb) =>
        eb.selectFrom('streamer_profile').select('streamer_profile.account_id').where('streamer_profile.account_id', 'is not', null)
      )
    );
};

const playersBoard = (input: PlayersBoardInput) => {
  const value = sql.ref<number | null>(`account_rating.${ACCOUNT_RATING_COLUMN[input.query.metric]}`);

  const rows = rankedPlayers(input)
    .leftJoin('clan', 'clan.clan_id', 'player.clan_id')
    .leftJoin('streamer_profile', 'streamer_profile.account_id', 'account_rating.account_id')
    .select((eb) => [
      'account_rating.account_id as accountId',
      eb.fn.coalesce('streamer_profile.display_name', 'player.nickname').as('name'),
      'clan.tag as clanTag',
      value.as('value'),
      'account_rating.battles'
    ])
    .orderBy(value, 'desc')
    .limit(input.query.limit)
    .offset(input.query.offset)
    .execute()
    .then(asPlayerRows);

  const total = rankedPlayers(input)
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .executeTakeFirst();

  return pageOf({ rows, total });
};

const tankFilters = ({ eb, query }: TankFiltersInput) => [
  ...(query.tankId === undefined ? [] : [eb('account_tank_rating.tank_id', '=', query.tankId)]),
  ...(query.tier === undefined ? [] : [eb('vehicle.tier', '=', query.tier)]),
  ...(query.type === undefined ? [] : [eb('vehicle.type', '=', query.type)])
];

const rankedTankPlayers = ({ db, query, minBattles }: RankedBoardInput) => {
  const column = sql.ref<number | null>(`account_tank_rating.${TANK_RATING_COLUMN[query.metric]}`);

  const aggregated = db
    .selectFrom('account_tank_rating')
    .innerJoin('vehicle', 'vehicle.tank_id', 'account_tank_rating.tank_id')
    .where('account_tank_rating.period', '=', RATING_PERIOD_SQL[query.period])
    .where((eb) => eb.and(tankFilters({ eb, query })))
    .groupBy('account_tank_rating.account_id')
    .having((eb) => eb.fn.sum('account_tank_rating.battles'), '>=', minBattles)
    .select((eb) => {
      const weighted = eb.fn.sum<number>(eb(column, '*', eb.ref('account_tank_rating.battles'))).filterWhere(column, 'is not', null);
      const battlesWithValue = eb.fn.sum<number>('account_tank_rating.battles').filterWhere(column, 'is not', null);

      return [
        'account_tank_rating.account_id',
        eb.fn.sum<number>('account_tank_rating.battles').as('battles'),
        eb(weighted, '/', eb.fn<number>('nullif', [battlesWithValue, eb.lit(0)]))
          .$castTo<number | null>()
          .as('value')
      ];
    });

  return db
    .with('ranked', () => aggregated)
    .selectFrom('ranked')
    .innerJoin('player', 'player.account_id', 'ranked.account_id')
    .where('player.is_hidden', '=', false)
    .where('ranked.value', 'is not', null);
};

const tankPlayersBoard = (input: RankedBoardInput) => {
  const rows = rankedTankPlayers(input)
    .leftJoin('clan', 'clan.clan_id', 'player.clan_id')
    .select(['ranked.account_id as accountId', 'player.nickname as name', 'clan.tag as clanTag', 'ranked.value', 'ranked.battles'])
    .orderBy('ranked.value', 'desc')
    .limit(input.query.limit)
    .offset(input.query.offset)
    .execute()
    .then(asPlayerRows);

  const total = rankedTankPlayers(input)
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .executeTakeFirst();

  return pageOf({ rows, total });
};

const activeClans = ({ db, query }: ClansBoardInput) => {
  const value = sql.ref<number | null>(`latest.${CLAN_SNAPSHOT_COLUMN[query.metric]}`);

  return db
    .selectFrom('clan')
    .innerJoinLateral(
      (eb) =>
        eb
          .selectFrom('clan_snapshot')
          .selectAll()
          .whereRef('clan_snapshot.clan_id', '=', 'clan.clan_id')
          .orderBy('clan_snapshot.captured_at', 'desc')
          .limit(1)
          .as('latest'),
      (join) => join.onTrue()
    )
    .where('clan.is_disbanded', '=', false)
    .where(value, 'is not', null);
};

const clansBoard = (input: ClansBoardInput) => {
  const value = sql.ref<number | null>(`latest.${CLAN_SNAPSHOT_COLUMN[input.query.metric]}`);

  const rows = activeClans(input)
    .select((eb) => [
      'clan.clan_id as clanId',
      'clan.name',
      'clan.tag as clanTag',
      'clan.color',
      value.as('value'),
      eb.fn.coalesce('latest.battles_delta', eb.lit(0)).as('battles')
    ])
    .orderBy(value, 'desc')
    .limit(input.query.limit)
    .offset(input.query.offset)
    .execute()
    .then((page) => page.map((row) => ({ accountId: null, delta: null, ...row })));

  const total = activeClans(input)
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .executeTakeFirst();

  return pageOf({ rows, total });
};

const risingPlayers = ({ db, query, period, minBattles }: RisingStarsBoardInput) => {
  const column = ACCOUNT_RATING_COLUMN[query.metric];
  const current = sql.ref<number | null>(`current.${column}`);
  const overall = sql.ref<number | null>(`overall.${column}`);

  return db
    .selectFrom('account_rating as current')
    .innerJoin('account_rating as overall', (join) =>
      join.onRef('overall.account_id', '=', 'current.account_id').on('overall.period', '=', RATING_PERIOD_SQL.overall)
    )
    .innerJoin('player', 'player.account_id', 'current.account_id')
    .where('player.is_hidden', '=', false)
    .where('current.period', '=', RATING_PERIOD_SQL[period])
    .where('current.battles', '>=', minBattles)
    .where(current, 'is not', null)
    .where(overall, 'is not', null);
};

const risingStarsBoard = (input: RisingStarsBoardInput) => {
  const column = ACCOUNT_RATING_COLUMN[input.query.metric];
  const current = sql.ref<number>(`current.${column}`);
  const overall = sql.ref<number>(`overall.${column}`);

  const rows = risingPlayers(input)
    .leftJoin('clan', 'clan.clan_id', 'player.clan_id')
    .select((eb) => [
      'current.account_id as accountId',
      'player.nickname as name',
      'clan.tag as clanTag',
      current.as('value'),
      'current.battles',
      eb(current, '-', overall).as('delta')
    ])
    .orderBy('delta', 'desc')
    .limit(input.query.limit)
    .offset(input.query.offset)
    .execute()
    .then(asPlayerRows);

  const total = risingPlayers(input)
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .executeTakeFirst();

  return pageOf({ rows, total });
};

const markedTanks = ({ db }: ClansBoardInput) =>
  db
    .selectFrom('player_tank')
    .innerJoin('player', 'player.account_id', 'player_tank.account_id')
    .where('player.is_hidden', '=', false)
    .where('player_tank.marks_on_gun', '=', LEADERBOARD_MARKS.marksOnGun)
    .where('player_tank.marks_source', '=', LEADERBOARD_MARKS.source)
    .where('player_tank.battles', '>', 0);

const marksBoard = (input: ClansBoardInput) => {
  const rows = markedTanks(input)
    .leftJoin('clan', 'clan.clan_id', 'player.clan_id')
    .select((eb) => [
      'player_tank.account_id as accountId',
      'player.nickname as name',
      'clan.tag as clanTag',
      eb.fn.countAll<number>().as('value'),
      eb.fn.sum<number>('player_tank.battles').as('battles')
    ])
    .groupBy(['player_tank.account_id', 'player.nickname', 'clan.tag'])
    .orderBy('value', 'desc')
    .limit(input.query.limit)
    .offset(input.query.offset)
    .execute()
    .then(asPlayerRows);

  const total = markedTanks(input)
    .select((eb) => eb.fn.count<number>('player_tank.account_id').distinct().as('total'))
    .executeTakeFirst();

  return pageOf({ rows, total });
};

export const leaderboardQueries = { playersBoard, tankPlayersBoard, clansBoard, risingStarsBoard, marksBoard } as const;
