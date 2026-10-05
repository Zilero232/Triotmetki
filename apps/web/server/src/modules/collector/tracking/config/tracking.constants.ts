import type { JobType } from 'bullmq';

const ACCOUNT_BLOCK_FIELDS = [
  'battles',
  'wins',
  'losses',
  'draws',
  'xp',
  'damage_dealt',
  'damage_received',
  'frags',
  'spotted',
  'capture_points',
  'dropped_capture_points',
  'hits',
  'shots',
  'survived_battles',
  'avg_damage_blocked',
  'avg_damage_assisted',
  'avg_damage_assisted_radio',
  'avg_damage_assisted_track',
  'avg_damage_assisted_stun',
  'max_damage',
  'max_damage_tank_id',
  'max_xp',
  'max_xp_tank_id',
  'max_frags',
  'max_frags_tank_id'
] as const;

const TANK_BLOCK_FIELDS = [
  'battles',
  'wins',
  'losses',
  'draws',
  'xp',
  'damage_dealt',
  'damage_received',
  'frags',
  'spotted',
  'capture_points',
  'dropped_capture_points',
  'hits',
  'shots',
  'survived_battles',
  'avg_damage_blocked'
] as const;

const ACCOUNT_MODE_BLOCKS = [
  'stronghold_skirmish',
  'stronghold_defense',
  'globalmap_absolute',
  'globalmap_middle',
  'globalmap_champion',
  'epic',
  'ranked_battles'
] as const;

const TANK_MODE_BLOCKS = ['stronghold_skirmish', 'stronghold_defense', 'globalmap', 'epic', 'ranked_battles'] as const;

const subFields = (block: string, fields: readonly string[]) => fields.map((field) => `${block}.${field}`);

export const TRACKING = {
  dispatch: {
    maxActivePerTick: 5000,
    sweepPageSize: 5000,
    sweepMinAgeHours: 20,
    addBulkChunk: 1000,
    dormantPriority: 10,
    sweepBacklogStates: ['waiting', 'delayed', 'prioritized'] satisfies JobType[]
  },
  intervals: {
    activeMinutes: 15,
    subscriberMinutes: 5,
    populationHours: 24,
    dormantDays: 7
  },
  lesta: {
    accountExtra: ['statistics.random'],
    accountModeExtra: ['statistics.epic', 'statistics.ranked_battles'],
    accountFields: [
      'account_id',
      'nickname',
      'clan_id',
      'global_rating',
      'created_at',
      'last_battle_time',
      'logout_at',
      'updated_at',
      ...subFields('statistics.all', ACCOUNT_BLOCK_FIELDS),
      ...subFields('statistics.random', ACCOUNT_BLOCK_FIELDS),
      ...ACCOUNT_MODE_BLOCKS.map((block) => `statistics.${block}`)
    ],
    tankExtra: ['random'],
    tankModeExtra: ['epic', 'ranked_battles'],
    tankFields: [
      'tank_id',
      'account_id',
      'mark_of_mastery',
      'max_frags',
      'max_xp',
      ...subFields('all', TANK_BLOCK_FIELDS),
      ...subFields('random', TANK_BLOCK_FIELDS),
      ...TANK_MODE_BLOCKS
    ],
    marksFields: ['tank_id', 'achievements'],
    marksAchievement: 'marksOnGun'
  },
  lock: {
    scope: 'poll'
  },
  transaction: {
    maxWaitMs: 5_000,
    timeoutMs: 15_000
  },
  ratingsDebounceMs: 30_000,
  seed: {
    ratingTypes: ['all'],
    rankFields: ['global_rating', 'battles_count', 'wins_ratio'],
    ratingsLimit: 1000,
    clanPages: 50,
    clanPageLimit: 100
  }
} as const;

export const TRACKING_TOKENS = {
  playerQueries: Symbol('TRACKING_PLAYER_QUERIES'),
  accountWriteQueries: Symbol('TRACKING_ACCOUNT_WRITE_QUERIES')
} as const;
