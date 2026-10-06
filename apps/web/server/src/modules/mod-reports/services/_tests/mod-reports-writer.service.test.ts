import type { ModProblemReportRequest } from '@otmetki/schemas';

import { HttpStatus } from '@nestjs/common';
import { MOD_REPORTS } from '@otmetki/schemas';
import { addDays } from 'date-fns';
import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ModProblemReport } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';

import { MOD_REPORTS_API } from '../../config/mod-reports.constants';
import { ModReportsWriterService } from '../mod-reports-writer.service';

const IP = '203.0.113.7';
const CREATED_AT = new Date('2026-09-30T12:00:00.000Z');

const body: ModProblemReportRequest = {
  manager_version: '0.3.0',
  modpack_version: '0.1.3',
  game_version: '1.45.0.0',
  message: 'The HUD is gone',
  files: [{ name: 'logs/python.log', text: 'Traceback' }]
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue('secret-for-tests-secret-for-tests');
  prisma.modProblemReport.create.mockResolvedValue(mock<ModProblemReport>({ id: '0f8fad5b-d9cb-469f-a165-70867728950e', createdAt: CREATED_AT }));

  return { service: new ModReportsWriterService(prisma, config, new RedisMock()), prisma };
};

describe('ModReportsWriterService.submit', () => {
  it('stores the report with a hash of the address, never the address itself', async () => {
    const { service, prisma } = createService();

    await service.submit({ body, ip: IP });

    const data = prisma.modProblemReport.create.mock.calls[0]?.[0].data;

    expect(data).toMatchObject({ managerVersion: '0.3.0', modpackVersion: '0.1.3', gameVersion: '1.45.0.0', files: body.files });
    expect(JSON.stringify(data)).not.toContain(IP);
  });

  it('answers when the report expires under the retention rule', async () => {
    const { service } = createService();

    await expect(service.submit({ body, ip: IP })).resolves.toEqual({
      id: '0f8fad5b-d9cb-469f-a165-70867728950e',
      expires_at: addDays(CREATED_AT, MOD_REPORTS.retentionDays).toISOString()
    });
  });

  it('refuses attachments past the total size with 413 before storing anything', async () => {
    const { service, prisma } = createService();
    const big = { name: 'a.log', text: 'a'.repeat(MOD_REPORTS.maxFileTextBytes) };

    await expect(service.submit({ body: { ...body, files: [big, big] }, ip: IP })).rejects.toMatchObject({ status: HttpStatus.PAYLOAD_TOO_LARGE });
    expect(prisma.modProblemReport.create).not.toHaveBeenCalled();
  });

  it('refuses reports from one address past the daily cap with 429', async () => {
    const { service, prisma } = createService();

    for (let sent = 0; sent < MOD_REPORTS_API.dailyCap; sent += 1) {
      await service.submit({ body, ip: IP });
    }

    await expect(service.submit({ body, ip: IP })).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(prisma.modProblemReport.create).toHaveBeenCalledTimes(MOD_REPORTS_API.dailyCap);
  });

  it('counts the cap per address', async () => {
    const { service } = createService();

    for (let sent = 0; sent < MOD_REPORTS_API.dailyCap; sent += 1) {
      await service.submit({ body, ip: IP });
    }

    await expect(service.submit({ body, ip: '198.51.100.9' })).resolves.toBeDefined();
  });

  it('tells a capped address how long until the daily window resets', async () => {
    const { service } = createService();

    for (let sent = 0; sent < MOD_REPORTS_API.dailyCap; sent += 1) {
      await service.submit({ body, ip: IP });
    }

    await expect(service.submit({ body, ip: IP })).rejects.toMatchObject({ retryAfterSec: MOD_REPORTS_API.dailyWindowSeconds });
  });
});
