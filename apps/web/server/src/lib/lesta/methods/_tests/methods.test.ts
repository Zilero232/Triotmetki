import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AccountInfo } from '../../schemas/account/account.types';
import type { TankStats } from '../../schemas/tanks/tanks.types';

import { accountInfoFixture, createFetchMock, ok, okWithMeta, tankStatsFixture } from '../../_tests/fixtures';
import { createLestaClient } from '../../client/client';
import { accountInfoSchema } from '../../schemas/account/account.schemas';
import { parseLoginCallback } from '../auth';

const APPLICATION_ID = 'test-app';

const idsFrom = (value: string | undefined): number[] => (value ?? '').split(',').filter(Boolean).map(Number);

describe('account methods', () => {
  it('chunks account/info into batches of 100 and merges the maps', async () => {
    const { fetch, calls } = createFetchMock(({ params }) =>
      ok(Object.fromEntries(idsFrom(params.account_id).map((id) => [String(id), accountInfoFixture(id)])))
    );

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });
    const accountIds = Array.from({ length: 250 }, (_, index) => index + 1);

    const result = await client.account.info({ accountIds });

    expect(calls.map(({ params }) => idsFrom(params.account_id).length)).toEqual([100, 100, 50]);
    expect(Object.keys(result)).toHaveLength(accountIds.length);
    expect(result['250']?.statistics.all.battles).toBe(accountInfoFixture(250).statistics.all.battles);
    expectTypeOf(result).toEqualTypeOf<Record<string, AccountInfo | null>>();
  });

  it('keeps null for unknown accounts', async () => {
    const { fetch } = createFetchMock(() => ok({ 1: accountInfoFixture(1), 2: null }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    const result = await client.account.info({ accountIds: [1, 2] });

    expect(result['2']).toBeNull();
  });

  it('skips full validation when fields narrow the payload', async () => {
    const { fetch, calls } = createFetchMock(() => ok({ 7: { nickname: 'OnlyNick' } }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    const result = await client.account.info({ accountIds: [7], fields: ['nickname'], extra: ['statistics.random'] });

    expect(result['7']?.nickname).toBe('OnlyNick');
    expect(calls[0]?.params.fields).toBe('nickname');
    expect(calls[0]?.params.extra).toBe('statistics.random');
  });

  it('dedupes ids before batching', async () => {
    const { fetch, calls } = createFetchMock(() => ok({}));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    await client.account.tanks({ accountIds: [1, 1, 2, 2], tankIds: [33] });

    expect(calls[0]?.params.account_id).toBe('1,2');
    expect(calls[0]?.params.tank_id).toBe('33');
  });

  it('batches exact nickname search by 100 names', async () => {
    const { fetch, calls } = createFetchMock(({ params }) =>
      ok((params.search ?? '').split(',').map((nickname, index) => ({ account_id: index, nickname })))
    );

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });
    const names = Array.from({ length: 130 }, (_, index) => `name_${index}`);

    const result = await client.account.list({ search: names });

    expect(calls).toHaveLength(2);
    expect(calls.every(({ params }) => params.type === 'exact')).toBe(true);
    expect(result).toHaveLength(names.length);
  });
});

describe('tanks methods', () => {
  it('splits tank ids for one account and flattens the per-account arrays', async () => {
    const accountId = 42;
    const { fetch, calls } = createFetchMock(({ params }) =>
      ok({ [accountId]: idsFrom(params.tank_id).map((tankId) => tankStatsFixture({ accountId, tankId })) })
    );

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });
    const tankIds = Array.from({ length: 150 }, (_, index) => index + 1);

    const result = await client.tanks.stats({ accountId, tankIds, extra: ['random'] });

    expect(calls).toHaveLength(2);
    expect(calls.every(({ params }) => params.account_id === String(accountId))).toBe(true);
    expect(result.map(({ tank_id }) => tank_id)).toEqual(tankIds);
    expectTypeOf(result).toEqualTypeOf<TankStats[]>();
  });

  it('returns an empty list for an account with no data', async () => {
    const { fetch } = createFetchMock(() => ok({ 9: null }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    await expect(client.tanks.stats({ accountId: 9 })).resolves.toEqual([]);
  });
});

describe('encyclopedia methods', () => {
  it('walks every page of encyclopedia/vehicles', async () => {
    const vehicle = (tankId: number) => ({ tank_id: tankId, name: `T-${tankId}`, tier: 5, type: 'mediumTank', nation: 'ussr', is_premium: false });
    const { fetch, calls } = createFetchMock(({ params }) => {
      const page = Number(params.page_no);

      return okWithMeta({ data: { [page]: vehicle(page) }, meta: { count: 1, page_total: 3 } });
    });

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    const result = await client.encyclopedia.allVehicles();

    expect(calls.map(({ params }) => params.page_no)).toEqual(['1', '2', '3']);
    expect(Object.keys(result)).toEqual(['1', '2', '3']);
  });

  it('passes module ids to vehicleprofile and unwraps the tank entry', async () => {
    const { fetch, calls } = createFetchMock(() => ok({ 1: { tank_id: 1, hp: 1500, speed_forward: 56 } }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    const profile = await client.encyclopedia.vehicleprofile({ tankId: 1, modules: { gunId: 10, engineId: 20 } });

    expect(profile?.hp).toBe(1500);
    expect(calls[0]?.params).toMatchObject({ tank_id: '1', gun_id: '10', engine_id: '20' });
  });
});

describe('auth', () => {
  it('builds a login url that carries the application id and redirect', () => {
    const client = createLestaClient({ applicationId: APPLICATION_ID });
    const url = new URL(client.auth.loginUrl({ redirectUri: 'https://triotmetki.ru/auth/callback', expiresAt: 1_800_000_000 }));

    expect(url.origin + url.pathname).toBe('https://api.tanki.su/wot/auth/login/');
    expect(url.searchParams.get('application_id')).toBe(APPLICATION_ID);
    expect(url.searchParams.get('redirect_uri')).toBe('https://triotmetki.ru/auth/callback');
    expect(url.searchParams.get('nofollow')).toBeNull();
  });

  it('parses a successful and a failed login callback', () => {
    expect(parseLoginCallback('status=ok&access_token=abc&nickname=Straik&account_id=123&expires_at=1800000000')).toEqual({
      status: 'ok',
      accessToken: 'abc',
      nickname: 'Straik',
      accountId: 123,
      expiresAt: 1_800_000_000
    });

    expect(parseLoginCallback('status=error&code=AUTH_CANCEL&message=AUTH_CANCEL')).toEqual({
      status: 'error',
      code: 'AUTH_CANCEL',
      message: 'AUTH_CANCEL'
    });
  });

  it('prolongates a token', async () => {
    const { fetch, calls } = createFetchMock(() => ok({ access_token: 'new', account_id: 1, expires_at: 1_900_000_000 }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    await expect(client.auth.prolongate({ accessToken: 'old' })).resolves.toMatchObject({ access_token: 'new' });
    expect(calls[0]?.params.access_token).toBe('old');
  });
});

describe('passthrough groups', () => {
  it('routes globalmap, stronghold and ratings calls to their paths', async () => {
    const { fetch, calls } = createFetchMock(() => ok({}));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    await client.globalmap.fronts();
    await client.stronghold.claninfo({ ids: [1, 2] });
    await client.ratings.accounts({ type: '28', accountIds: [5] });
    await client.clanratings.top({ params: { rank_field: 'efficiency' } });

    expect(calls.map(({ method }) => method)).toEqual(['globalmap/fronts', 'stronghold/claninfo', 'ratings/accounts', 'clanratings/top']);
    expect(calls[1]?.params.clan_id).toBe('1,2');
    expect(calls[3]?.params.rank_field).toBe('efficiency');
  });
});

describe('ratings methods', () => {
  it('keeps the known rank fields of an account and drops a malformed one', async () => {
    const { fetch } = createFetchMock(() =>
      ok({
        5: { account_id: 5, wins_ratio: { value: 55.1, rank: 12, rank_delta: -3 }, damage_avg: 'broken' },
        6: null
      })
    );

    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });
    const result = await client.ratings.accounts({ type: '7', accountIds: [5, 6] });

    expect(result['5']?.wins_ratio).toEqual({ value: 55.1, rank: 12, rank_delta: -3 });
    expect(result['5']?.damage_avg).toBeNull();
    expect(result['6']).toBeNull();
  });

  it('sends the rank field, type and page of a top list', async () => {
    const { fetch, calls } = createFetchMock(() => ok([{ account_id: 1, global_rating: { value: 9000, rank: 1, rank_delta: 0 } }]));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    const top = await client.ratings.topList({ type: 'all', rankField: 'global_rating', limit: 50, pageNo: 2 });

    expect(top[0]?.global_rating?.rank).toBe(1);
    expect(calls[0]?.method).toBe('ratings/top');
    expect(calls[0]?.params).toMatchObject({ type: 'all', rank_field: 'global_rating', limit: '50', page_no: '2' });
  });

  it('asks for the neighbours of one account', async () => {
    const { fetch, calls } = createFetchMock(() => ok([]));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    await client.ratings.neighborList({ type: '28', rankField: 'wins_ratio', accountId: 9, limit: 5 });

    expect(calls[0]?.method).toBe('ratings/neighbors');
    expect(calls[0]?.params).toMatchObject({ account_id: '9', rank_field: 'wins_ratio', type: '28', limit: '5' });
  });
});

describe('mode statistics blocks', () => {
  it('drops a malformed mode block instead of failing the whole account', async () => {
    const info = accountInfoFixture(3);
    const { fetch } = createFetchMock(() => ok({ 3: { ...info, statistics: { ...info.statistics, ranked_battles: { battles: 'n/a' } } } }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    const result = await client.account.info({ accountIds: [3] });
    const parsed = accountInfoSchema.parse(result['3']);

    expect(parsed.statistics.ranked_battles).toBeUndefined();
    expect(parsed.statistics.stronghold_skirmish?.battles).toBe(info.statistics.stronghold_skirmish.battles);
  });
});
