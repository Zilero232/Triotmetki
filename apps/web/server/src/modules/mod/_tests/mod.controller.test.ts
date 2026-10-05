import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';

import { HttpStatus } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AuthenticatedDevice } from '../mod.types';
import type { ModBindWriterService } from '../services/mod-bind-writer.service';
import type { ModDeviceService } from '../services/mod-device.service';
import type { ModIngestWriterService } from '../services/mod-ingest-writer.service';

import { ModException } from '../../../common/exceptions';
import { ingestBatchSchema } from '../lib/contract';
import { ModController } from '../mod.controller';

const example = ingestBatchSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../../../game/modpack/contract/examples/ingest.example.json', import.meta.url), 'utf8'))
);

const device: AuthenticatedDevice = {
  id: example.device_id,
  userId: 'user',
  accountId: BigInt(example.account_id),
  name: null,
  secretHash: 'hash',
  modVersion: null,
  gameVersion: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-09-27T12:00:00Z')
};

const createController = () => {
  const devices = mock<ModDeviceService>();
  const ingestion = mock<ModIngestWriterService>();

  devices.authenticateBody.mockImplementation(async ({ request }) => ({ device, body: ingestBatchSchema.parse(request.body) }));
  ingestion.ingest.mockResolvedValue({ accepted: example.events.length, duplicates: 0 });

  return { controller: new ModController(mock<ModBindWriterService>(), devices, ingestion), devices, ingestion };
};

const requestWith = (body: unknown) => Object.assign(mock<RawBodyRequest<Request>>(), { body, rawBody: Buffer.from(JSON.stringify(body)) });

const rejection = async (run: Promise<unknown>) => {
  const error = await run.catch((caught: unknown) => caught);

  if (!(error instanceof ModException)) {
    throw new TypeError('expected a ModException');
  }

  return { status: error.getStatus(), body: error.getResponse() };
};

describe('ModController.ingest', () => {
  it('authenticates the device and parses the batch against the ingest contract before anything else', async () => {
    const { controller, devices, ingestion } = createController();
    const request = requestWith(example);

    devices.authenticateBody.mockRejectedValue(new ModException({ status: HttpStatus.UNAUTHORIZED, error: 'bad_signature' }));

    expect(await rejection(controller.ingest(request, mock<Response>()))).toEqual({
      status: HttpStatus.UNAUTHORIZED,
      body: { error: 'bad_signature' }
    });

    expect(devices.authenticateBody).toHaveBeenCalledWith({ request, schema: ingestBatchSchema });
    expect(ingestion.ingest).not.toHaveBeenCalled();
  });

  it('hands the parsed batch to ingestion and keeps the default status when something is new', async () => {
    const { controller, ingestion } = createController();
    const response = mock<Response>();

    ingestion.ingest.mockResolvedValue({ accepted: 1, duplicates: example.events.length - 1 });

    expect(await controller.ingest(requestWith(example), response)).toEqual({ accepted: 1, duplicates: example.events.length - 1 });
    expect(ingestion.ingest).toHaveBeenCalledWith({ device, batch: example });
    expect(response.status).not.toHaveBeenCalled();
  });

  it('answers conflict when every event of the batch was already stored', async () => {
    const { controller, ingestion } = createController();
    const response = mock<Response>();

    ingestion.ingest.mockResolvedValue({ accepted: 0, duplicates: example.events.length });

    await controller.ingest(requestWith(example), response);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it('keeps the default status when nothing was accepted but not everything was a duplicate', async () => {
    const { controller, ingestion } = createController();
    const response = mock<Response>();

    ingestion.ingest.mockResolvedValue({ accepted: 0, duplicates: example.events.length - 1 });

    await controller.ingest(requestWith(example), response);

    expect(response.status).not.toHaveBeenCalled();
  });
});
