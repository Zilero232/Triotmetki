import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { LestaClients } from '../../../../core';

import { LestaNetworkError } from '../../../../lib/lesta';
import { ServersOnlineReaderService } from '../servers-online-reader.service';

const createService = (applicationId: string) => {
  const config = mock<AppConfigService>();
  const clients = mockDeep<LestaClients>();

  config.get.mockReturnValue(applicationId);

  return { service: new ServersOnlineReaderService(config, clients), clients };
};

describe('ServersOnlineReaderService', () => {
  it('sums the online of every server', async () => {
    const { service, clients } = createService('app');
    const servers = [
      { server: 'RU1', players_online: 1200 },
      { server: 'RU2', players_online: 800 }
    ];

    clients.priority.wgn.servers.mockResolvedValue(servers);

    const result = await service.current();

    expect(result.online).toBe(servers[0].players_online + servers[1].players_online);
    expect(result.servers).toEqual(servers.map((entry) => ({ server: entry.server, online: entry.players_online })));
  });

  it('reports no online without a Lesta application id and never calls Lesta', async () => {
    const { service, clients } = createService('');

    expect(await service.current()).toEqual({ online: null, servers: [], fetchedAt: null });
    expect(clients.priority.wgn.servers).not.toHaveBeenCalled();
  });

  it('reports no online when Lesta fails', async () => {
    const { service, clients } = createService('app');

    clients.priority.wgn.servers.mockRejectedValue(new LestaNetworkError({ method: 'wgn/servers/info', cause: new Error('timeout') }));

    expect(await service.current()).toEqual({ online: null, servers: [], fetchedAt: null });
  });
});
