import { addMinutes } from 'date-fns';
import RedisMock from 'ioredis-mock';
import { afterAll, beforeEach, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { UserAccountsReaderService } from '../../../accounts';
import { BIND_CODE } from '../../config/bind-code.constants';
import { MOD_DEVICE_LIMITS } from '../../config/device.constants';
import { ModBindWriterService } from '../mod-bind-writer.service';

const SEED = {
  userId: 'bind-user',
  accountId: 12_345n,
  requester: '203.0.113.7'
} as const;

describeWithDatabase('ModBindWriterService on a real database', () => {
  const prisma = createTestPrisma();

  const createService = () => {
    const config = mock<AppConfigService>();

    config.get.mockReturnValue('server-secret-for-tests');

    return new ModBindWriterService(prisma, config, new RedisMock(), new UserAccountsReaderService(prisma));
  };

  const bindOnce = async (service: ModBindWriterService) => {
    const { code } = await service.issueCode({ userId: SEED.userId, accountId: undefined });

    return service.bind({ body: { code, mod_version: '1.0.0', client_version: '1.30.0', realm: 'RU' }, requester: SEED.requester });
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['one_time_code', 'mod_device', 'user_lesta_account', 'player', 'user'] });
    await prisma.user.create({ data: { id: SEED.userId, name: 'Binder', email: 'bind@example.test' } });
    await prisma.player.create({ data: { accountId: SEED.accountId, nickname: 'Binder' } });
    await prisma.userLestaAccount.create({ data: { userId: SEED.userId, accountId: SEED.accountId, isPrimary: true } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('binds a device to the linked account and marks the code used', async () => {
    const response = await bindOnce(createService());

    const device = await prisma.modDevice.findUniqueOrThrow({ where: { id: response.device_id } });
    const code = await prisma.oneTimeCode.findFirstOrThrow({ where: { deviceId: response.device_id } });

    expect(response).toMatchObject({ account_id: Number(SEED.accountId), nickname: 'Binder' });
    expect(device).toMatchObject({ userId: SEED.userId, accountId: SEED.accountId, revokedAt: null, modVersion: '1.0.0', gameVersion: '1.30.0' });
    expect(code.usedAt).not.toBeNull();
  });

  it('revokes the oldest device when a bind would pass the per-user cap', async () => {
    const service = createService();
    const first = await bindOnce(service);

    for (let index = 1; index < MOD_DEVICE_LIMITS.maxPerUser; index += 1) {
      await bindOnce(service);
    }

    const overflow = await bindOnce(service);
    const active = await prisma.modDevice.count({ where: { userId: SEED.userId, revokedAt: null } });

    expect(overflow.revoked_device_ids).toEqual([first.device_id]);
    expect(active).toBe(MOD_DEVICE_LIMITS.maxPerUser);
  });

  it('keeps the cap when several binds race', async () => {
    const service = createService();
    const codes = Array.from({ length: MOD_DEVICE_LIMITS.maxPerUser + 2 }, (_, index) => `ABCDEFGH${BIND_CODE.alphabet.slice(index, index + 2)}`);

    await prisma.oneTimeCode.createMany({
      data: codes.map((code) => ({ code, purpose: 'modBind' as const, userId: SEED.userId, expiresAt: addMinutes(new Date(), BIND_CODE.ttlMinutes) }))
    });

    const results = await Promise.all(
      codes.map((code) => service.bind({ body: { code, mod_version: '1.0.0', client_version: '1.30.0', realm: 'RU' }, requester: SEED.requester }))
    );

    expect(results).toHaveLength(codes.length);
    expect(await prisma.modDevice.count({ where: { userId: SEED.userId, revokedAt: null } })).toBe(MOD_DEVICE_LIMITS.maxPerUser);
  });
});
