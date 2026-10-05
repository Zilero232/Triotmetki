import type { NestExpressApplication } from '@nestjs/platform-express';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MOD_REPORTS, modProblemReportReceiptSchema } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ModProblemReport } from '../../../../generated';

import { AllExceptionsFilter } from '../../../common/filters';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { ModReportsController } from '../mod-reports.controller';
import { ModReportsWriterService } from '../services/mod-reports-writer.service';

const prisma = mockDeep<PrismaService>();
const config = mock<AppConfigService>();

const report = {
  manager_version: '0.3.0',
  modpack_version: null,
  game_version: null,
  message: '',
  files: [{ name: 'manager.log', text: 'started' }]
};

let app: NestExpressApplication;

const send = (body: object) => request(app.getHttpServer()).post('/mod/reports').send(body);

beforeAll(async () => {
  config.get.mockReturnValue('secret-for-tests-secret-for-tests');

  const moduleRef = await Test.createTestingModule({
    controllers: [ModReportsController],
    providers: [
      ModReportsWriterService,
      { provide: PrismaService, useValue: prisma },
      { provide: AppConfigService, useValue: config },
      { provide: REDIS, useValue: new RedisMock() },
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
    ]
  }).compile();

  app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  app.useBodyParser('json', { limit: '512kb' });
  await app.init();
});

beforeEach(() => {
  prisma.modProblemReport.create.mockReset();

  prisma.modProblemReport.create.mockResolvedValue(
    mock<ModProblemReport>({ id: '0f8fad5b-d9cb-469f-a165-70867728950e', createdAt: new Date('2026-09-30T12:00:00.000Z') })
  );
});

afterAll(async () => {
  await app.close();
});

describe('POST /mod/reports', () => {
  it('stores an anonymous report and answers 201 with its id and expiry', async () => {
    const response = await send(report);

    expect(response.status).toBe(201);
    expect(modProblemReportReceiptSchema.parse(response.body).id).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
  });

  it('answers 400 in the API error format for a report without files', async () => {
    const response = await send({ ...report, files: [] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(prisma.modProblemReport.create).not.toHaveBeenCalled();
  });

  it('answers 400 for a file name that could leave its folder', async () => {
    const response = await send({ ...report, files: [{ name: '..\\secret', text: '' }] });

    expect(response.status).toBe(400);
  });

  it('answers 400 for a field the contract does not know', async () => {
    const response = await send({ ...report, email: 'user@example.com' });

    expect(response.status).toBe(400);
  });

  it('answers 413 in the API error format when the attachments pass the total size', async () => {
    const file = { name: 'a.log', text: 'a'.repeat(MOD_REPORTS.maxTotalTextBytes / 2 + 1) };
    const response = await send({ ...report, files: [file, { ...file, name: 'b.log' }] });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
