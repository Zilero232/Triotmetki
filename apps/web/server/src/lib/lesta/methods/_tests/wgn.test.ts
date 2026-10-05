import { describe, expect, it } from 'vitest';

import { createFetchMock, ok } from '../../_tests/fixtures';
import { createLestaClient } from '../../client/client';

const APPLICATION_ID = 'test-app';

describe('wgn methods', () => {
  it('asks the wgn root for the tanks game servers', async () => {
    const { fetch, calls } = createFetchMock(() => ok({ wot: [{ server: 'RU1', players_online: 1200 }] }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    await client.wgn.servers();

    expect(new URL(calls[0]?.url ?? '').pathname).toBe('/wgn/servers/info/');
    expect(calls[0]?.params.game).toBe('wot');
  });

  it('returns the per-server online of the tanks game', async () => {
    const servers = [
      { server: 'RU1', players_online: 1200 },
      { server: 'RU2', players_online: 800 }
    ];

    const { fetch } = createFetchMock(() => ok({ wot: servers }));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    expect(await client.wgn.servers()).toEqual(servers);
  });

  it('returns no servers when the game is missing from the reply', async () => {
    const { fetch } = createFetchMock(() => ok({}));
    const client = createLestaClient({ applicationId: APPLICATION_ID, fetch });

    expect(await client.wgn.servers()).toEqual([]);
  });
});
