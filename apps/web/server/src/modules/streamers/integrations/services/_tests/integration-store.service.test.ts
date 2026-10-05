import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { StreamerIntegration } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { SaveIntegrationInput } from '../../integrations.types';

import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../../../common/exceptions';
import { createTokenCipher } from '../../../../../core/token-cipher/_tests/token-cipher.fixtures';
import { IntegrationStoreService } from '../integration-store.service';

const CONNECTED = new Date('2026-09-01T12:00:00.000Z');
const EXPIRES = new Date('2026-09-01T13:00:00.000Z');

const integration = (overrides: Partial<StreamerIntegration> = {}): StreamerIntegration => ({
  id: 'int-1',
  userId: 'u1',
  provider: 'twitch',
  externalId: '777',
  accessToken: 'a',
  refreshToken: 'r',
  tokenExpiresAt: null,
  scope: null,
  config: null,
  createdAt: CONNECTED,
  updatedAt: CONNECTED,
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  const cipher = createTokenCipher();

  return { service: new IntegrationStoreService(prisma, cipher), prisma, cipher };
};

describe('IntegrationStoreService.list', () => {
  it('shows the stored login only when it is a string', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findMany.mockResolvedValue([
      integration({ config: { login: 'jove' } }),
      integration({ provider: 'donationAlerts', config: { login: 42 } }),
      integration({ provider: 'youtube', config: null })
    ]);

    const views = await service.list('u1');

    expect(views.map(({ login }) => login)).toEqual(['jove', null, null]);

    expect(views[0]).toEqual({
      provider: 'twitch',
      externalId: '777',
      login: 'jove',
      connectedAt: CONNECTED.toISOString(),
      predictions: false,
      canPredict: false
    });
  });

  it('reports the predictions toggle and whether the Twitch token may run predictions', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findMany.mockResolvedValue([
      integration({ scope: 'chat:read channel:manage:predictions', config: { predictions: true } })
    ]);

    expect(await service.list('u1')).toEqual([expect.objectContaining({ predictions: true, canPredict: true })]);
  });
});

describe('IntegrationStoreService.save', () => {
  const input = {
    userId: 'u1',
    provider: 'twitch',
    externalId: '777',
    accessToken: 'a',
    refreshToken: 'r',
    expiresAt: EXPIRES,
    scope: 'chat:read',
    config: null
  } satisfies SaveIntegrationInput;

  it('binds the external account to the user who connected it', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.count.mockResolvedValue(0);

    await service.save(input);

    expect(prisma.streamerIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_provider: { userId: 'u1', provider: 'twitch' } },
        update: expect.objectContaining({ externalId: '777', tokenExpiresAt: EXPIRES })
      })
    );
  });

  it('stores the access and refresh tokens encrypted', async () => {
    const { service, prisma, cipher } = createService();

    prisma.streamerIntegration.count.mockResolvedValue(0);

    await service.save(input);

    const stored = prisma.streamerIntegration.upsert.mock.calls[0]?.[0]?.create;

    expect([stored?.accessToken, stored?.refreshToken]).not.toContain(input.accessToken);
    expect(typeof stored?.accessToken === 'string' ? await cipher.open(stored.accessToken) : null).toBe(input.accessToken);
  });

  it('refuses to take over an external account another user has connected', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.count.mockResolvedValue(1);

    await expect(service.save(input)).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.streamerIntegration.count).toHaveBeenCalledWith({ where: { provider: 'twitch', externalId: '777', NOT: { userId: 'u1' } } });
    expect(prisma.streamerIntegration.deleteMany).not.toHaveBeenCalled();
    expect(prisma.streamerIntegration.upsert).not.toHaveBeenCalled();
  });

  it('keeps the stored config when the new connection brings none', async () => {
    const { service, prisma } = createService();

    await service.save(input);

    expect(prisma.streamerIntegration.upsert.mock.calls[0]?.[0].update.config).toBeUndefined();
  });

  it('merges the new config over the stored one so the predictions toggle survives a reconnect', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration({ config: { login: 'old', predictions: true } }));

    await service.save({ ...input, config: { login: 'jove' } });

    expect(prisma.streamerIntegration.upsert.mock.calls[0]?.[0].update.config).toEqual({ login: 'jove', predictions: true });
  });
});

describe('IntegrationStoreService.setPredictions', () => {
  it('stores the toggle next to the login', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration({ scope: 'channel:manage:predictions', config: { login: 'jove' } }));
    prisma.streamerIntegration.findMany.mockResolvedValue([]);

    await service.setPredictions({ userId: 'u1', enabled: true });

    expect(prisma.streamerIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int-1' },
        data: { config: { login: 'jove', predictions: true } }
      })
    );
  });

  it('refuses to enable predictions without the Twitch scope or connection', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValueOnce(integration({ scope: 'chat:read' }));
    await expect(service.setPredictions({ userId: 'u1', enabled: true })).rejects.toBeInstanceOf(AppBadRequestException);

    prisma.streamerIntegration.findUnique.mockResolvedValueOnce(null);
    await expect(service.setPredictions({ userId: 'u1', enabled: false })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});

describe('IntegrationStoreService.storeToken', () => {
  it('refreshes the tokens of the external account whoever owns it', async () => {
    const { service, prisma } = createService();

    await service.storeToken({ provider: 'donationAlerts', externalId: '42', accessToken: 'a2', refreshToken: 'r2', expiresAt: EXPIRES });

    expect(prisma.streamerIntegration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { provider: 'donationAlerts', externalId: '42' }, data: expect.objectContaining({ tokenExpiresAt: EXPIRES }) })
    );
  });

  it('encrypts the refreshed tokens and hands them back decrypted to the listeners', async () => {
    const { service, prisma } = createService();

    await service.storeToken({ provider: 'donationAlerts', externalId: '42', accessToken: 'a2', refreshToken: 'r2', expiresAt: EXPIRES });

    const data = prisma.streamerIntegration.updateMany.mock.calls[0]?.[0]?.data;

    expect([data?.accessToken, data?.refreshToken]).not.toContain('a2');
    expect([data?.accessToken, data?.refreshToken]).not.toContain('r2');

    prisma.streamerIntegration.findMany.mockResolvedValue([
      integration({
        accessToken: typeof data?.accessToken === 'string' ? data.accessToken : null,
        refreshToken: typeof data?.refreshToken === 'string' ? data.refreshToken : null
      })
    ]);

    expect(await service.byProvider('donationAlerts')).toEqual([expect.objectContaining({ accessToken: 'a2', refreshToken: 'r2' })]);
  });
});
