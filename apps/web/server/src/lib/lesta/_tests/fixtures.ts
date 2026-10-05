import type { LestaFetch } from '../client/client.types';
import type { FetchHandler, FetchReply, LestaErrorFixtureInput, OkWithMetaInput, RecordedCall, TankStatsFixtureInput } from './fixtures.types';

const statsBlock = (battles: number) => ({
  battles,
  wins: Math.round(battles * 0.52),
  losses: Math.round(battles * 0.46),
  draws: battles - Math.round(battles * 0.52) - Math.round(battles * 0.46),
  xp: battles * 700,
  battle_avg_xp: 700,
  damage_dealt: battles * 1800,
  damage_received: battles * 1200,
  frags: battles,
  spotted: Math.round(battles * 1.3),
  capture_points: battles,
  dropped_capture_points: Math.round(battles * 0.8),
  hits: battles * 6,
  shots: battles * 8,
  hits_percents: 75,
  piercings: battles * 5,
  piercings_received: battles * 4,
  explosion_hits: 12,
  explosion_hits_received: 30,
  direct_hits_received: battles * 6,
  no_damage_direct_hits_received: battles * 2,
  avg_damage_blocked: 450.2,
  tanking_factor: 0.31,
  survived_battles: Math.round(battles * 0.33),
  stun_number: 0,
  stun_assisted_damage: 0
});

export const accountInfoFixture = (accountId: number) => ({
  account_id: accountId,
  nickname: `Tanker_${accountId}`,
  clan_id: null,
  global_rating: 5120,
  created_at: 1_356_998_400,
  last_battle_time: 1_758_700_000,
  logout_at: 1_758_703_600,
  updated_at: 1_758_703_700,
  client_language: 'ru',
  private: null,
  statistics: {
    all: { ...statsBlock(12_000), max_xp: 2400, max_xp_tank_id: 1, max_damage: 9800, max_damage_tank_id: 2, max_frags: 9, max_frags_tank_id: 3 },
    clan: statsBlock(0),
    company: statsBlock(0),
    stronghold_skirmish: statsBlock(120),
    stronghold_defense: statsBlock(4),
    regular_team: statsBlock(0),
    team: statsBlock(0),
    historical: statsBlock(0),
    trees_cut: 20_411,
    frags: null
  }
});

export const tankStatsFixture = ({ accountId, tankId }: TankStatsFixtureInput) => ({
  tank_id: tankId,
  account_id: accountId,
  mark_of_mastery: 3,
  max_frags: 6,
  max_xp: 1900,
  in_garage: null,
  frags: null,
  all: statsBlock(300),
  clan: statsBlock(0),
  company: statsBlock(0),
  stronghold_skirmish: statsBlock(4),
  stronghold_defense: statsBlock(0),
  regular_team: statsBlock(0),
  team: statsBlock(0),
  globalmap: statsBlock(0)
});

export const okWithMeta = ({ data, meta }: OkWithMetaInput): FetchReply => ({ body: { status: 'ok', meta, data } });

export const ok = (data: unknown): FetchReply => okWithMeta({ data, meta: { count: 1 } });

export const lestaError = ({ code, message, field = null, value = null }: LestaErrorFixtureInput): FetchReply => ({
  body: { status: 'error', error: { code, message, field, value } }
});

export const createFetchMock = (handler: FetchHandler) => {
  const calls: RecordedCall[] = [];

  const fetch: LestaFetch = async (input, init) => {
    const request = input instanceof Request ? new Request(input, init) : new Request(String(input), init);
    const { url } = request;
    const params = Object.fromEntries(new URLSearchParams(await request.text()));
    const method = url.replace(/^https:\/\/api\.tanki\.su\/wot\//, '').replace(/\/$/, '');
    const call = { url, method, params };

    calls.push(call);

    const reply = handler(call);

    if (reply instanceof Error) {
      throw reply;
    }

    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };

  return { fetch, calls };
};

export const FAST_RETRY = { retries: 3, minTimeout: 1, maxTimeout: 2, randomize: false } as const;
