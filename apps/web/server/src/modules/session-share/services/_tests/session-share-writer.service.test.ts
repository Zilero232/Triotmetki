import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { SessionSharePreference, User } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ShareRecipientRow } from '../../selects/session-share.selects';

import { ModException } from '../../../../common/exceptions';
import { sessionUuid } from '../../../mod';
import { SessionShareQueueService } from '../session-share-queue.service';
import { SessionShareWriterService } from '../session-share-writer.service';

const ACCOUNT = 12_345_678n;
const MOD_SESSION = '0123456789abcdef0123456789abcdef';

const recipient = (overrides: Partial<ShareRecipientRow> = {}) =>
  mock<User & ShareRecipientRow>({ locale: 'ru', telegramAccount: { telegramId: 42n }, accounts: [], ...overrides });

const preference = (overrides: Partial<SessionSharePreference> = {}): SessionSharePreference => ({
  userId: 'user',
  enabled: true,
  channels: ['telegram'],
  updatedAt: new Date('2026-09-28T00:00:00.000Z'),
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const queue = mock<SessionShareQueueService>();

  prisma.user.findUnique.mockResolvedValue(recipient());

  prisma.sessionSharePreference.upsert.mockResolvedValue(preference());

  return { service: new SessionShareWriterService(prisma, queue), prisma, queue };
};

const rejectionOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason
  );

  expect(error).toBeInstanceOf(ModException);

  return error instanceof ModException ? { status: error.getStatus(), body: error.getResponse() } : null;
};

describe('SessionShareWriterService.savePreference', () => {
  it('stores the flag and the channels per user and answers them for the device account', async () => {
    const { service, prisma } = createService();

    await expect(service.savePreference({ userId: 'user', accountId: ACCOUNT, enabled: true, channels: ['telegram'] })).resolves.toEqual({
      account_id: Number(ACCOUNT),
      enabled: true,
      channels: ['telegram']
    });

    expect(prisma.sessionSharePreference.upsert.mock.calls[0]?.[0]).toMatchObject({
      where: { userId: 'user' },
      update: { enabled: true, channels: ['telegram'] }
    });
  });

  it('refuses to turn sharing on for a channel the user has not linked', async () => {
    const { service, prisma } = createService();

    const rejection = await rejectionOf(service.savePreference({ userId: 'user', accountId: ACCOUNT, enabled: true, channels: ['discord'] }));

    expect(rejection).toEqual({ status: HttpStatus.CONFLICT, body: expect.objectContaining({ error: 'channel_not_linked' }) });
    expect(prisma.sessionSharePreference.upsert).not.toHaveBeenCalled();
  });

  it('lets the user turn sharing off whatever is linked', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({ telegramAccount: null }));
    prisma.sessionSharePreference.upsert.mockResolvedValue(preference({ enabled: false, channels: ['discord'] }));

    await expect(service.savePreference({ userId: 'user', accountId: ACCOUNT, enabled: false, channels: ['discord'] })).resolves.toMatchObject({
      enabled: false
    });
  });
});

describe('SessionShareWriterService.send', () => {
  it('queues the card of the device account session named by the mod id', async () => {
    const { service, prisma, queue } = createService();
    const id = sessionUuid({ accountId: ACCOUNT, sessionId: MOD_SESSION });

    prisma.playSession.findFirst.mockResolvedValue(mock({ id }));

    await expect(service.send({ userId: 'user', accountId: ACCOUNT, modSessionId: MOD_SESSION, channels: ['telegram'] })).resolves.toEqual({
      account_id: Number(ACCOUNT),
      queued: ['telegram']
    });

    expect(prisma.playSession.findFirst.mock.calls[0]?.[0]?.where).toMatchObject({ id, accountId: ACCOUNT, source: 'mod', kind: 'live' });
    expect(queue.enqueue).toHaveBeenCalledWith({ userId: 'user', sessionId: id, channels: ['telegram'] });
  });

  it('answers session_not_found for a session the account has no battles in', async () => {
    const { service, prisma, queue } = createService();

    prisma.playSession.findFirst.mockResolvedValue(null);

    const rejection = await rejectionOf(service.send({ userId: 'user', accountId: ACCOUNT, modSessionId: MOD_SESSION, channels: ['telegram'] }));

    expect(rejection).toEqual({ status: HttpStatus.NOT_FOUND, body: expect.objectContaining({ error: 'session_not_found' }) });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('refuses before looking the session up when a chosen channel is not linked', async () => {
    const { service, prisma } = createService();

    const rejection = await rejectionOf(
      service.send({ userId: 'user', accountId: ACCOUNT, modSessionId: MOD_SESSION, channels: ['telegram', 'discord'] })
    );

    expect(rejection?.status).toBe(HttpStatus.CONFLICT);
    expect(prisma.playSession.findFirst).not.toHaveBeenCalled();
  });
});
