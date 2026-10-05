import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { NotificationSettings } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { NOTIFICATION_DEFAULTS } from '../../../notifications';
import { NotificationSettingsWriterService } from '../notification-settings-writer.service';

const row = (overrides: Partial<NotificationSettings>): NotificationSettings =>
  mock<NotificationSettings>({
    channels: ['site', 'webPush'],
    events: ['moeGained'],
    quietHoursStart: null,
    quietHoursEnd: null,
    sessionReport: true,
    weeklyDigest: false,
    ...overrides
  });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.notificationSettings.upsert.mockResolvedValue(row({}));

  return { service: new NotificationSettingsWriterService(prisma), prisma };
};

describe('NotificationSettingsWriterService.get', () => {
  it('returns the defaults for a user who never saved settings', async () => {
    const { service, prisma } = createService();

    prisma.notificationSettings.findUnique.mockResolvedValue(null);

    const settings = await service.get('user');

    expect(settings.channels).toHaveLength(NOTIFICATION_DEFAULTS.channels.length);
    expect(settings).toMatchObject({ quietHours: null, sessionReport: NOTIFICATION_DEFAULTS.sessionReport, weeklyDigest: false });
  });

  it('uses the public channel names', async () => {
    const { service, prisma } = createService();

    prisma.notificationSettings.findUnique.mockResolvedValue(row({}));

    expect((await service.get('user')).channels).toEqual(['site', 'web_push']);
  });

  it('reports quiet hours only when both ends are set and differ', async () => {
    const { service, prisma } = createService();

    prisma.notificationSettings.findUnique.mockResolvedValueOnce(row({ quietHoursStart: 23, quietHoursEnd: 7 }));
    prisma.notificationSettings.findUnique.mockResolvedValueOnce(row({ quietHoursStart: 0, quietHoursEnd: 0 }));
    prisma.notificationSettings.findUnique.mockResolvedValueOnce(row({ quietHoursStart: 23, quietHoursEnd: null }));

    expect((await service.get('user')).quietHours).toEqual({ start: 23, end: 7 });
    expect((await service.get('user')).quietHours).toBeNull();
    expect((await service.get('user')).quietHours).toBeNull();
  });
});

describe('NotificationSettingsWriterService.update', () => {
  it('changes only the fields that were sent', async () => {
    const { service, prisma } = createService();

    await service.update({ userId: 'user', weeklyDigest: true });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].update).toEqual({ weeklyDigest: true });
  });

  it('maps public names to the database and drops unknown ones', async () => {
    const { service, prisma } = createService();

    await service.update({ userId: 'user', channels: ['web_push', 'site'] });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].update).toEqual({ channels: ['webPush', 'site'] });
  });

  it('clears quiet hours when null is sent and keeps them when omitted', async () => {
    const { service, prisma } = createService();

    await service.update({ userId: 'user', quietHours: null });
    await service.update({ userId: 'user', sessionReport: false });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].update).toEqual({ quietHoursStart: null, quietHoursEnd: null });
    expect(prisma.notificationSettings.upsert.mock.calls[1]?.[0].update).toEqual({ sessionReport: false });
  });

  it('creates the row from the defaults plus the sent fields', async () => {
    const { service, prisma } = createService();

    await service.update({ userId: 'user', weeklyDigest: true });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].create).toMatchObject({
      userId: 'user',
      channels: [...NOTIFICATION_DEFAULTS.channels],
      events: [...NOTIFICATION_DEFAULTS.events],
      weeklyDigest: true
    });
  });
});
