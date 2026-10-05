import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { StreamerChannel, StreamerClaim, StreamerIntegration, StreamerInvitation, StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { LivePlatformsService } from '../../../live';
import type { StreamerProfileService } from '../streamer-profile.service';

import { Prisma } from '../../../../../../generated';
import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../../../common/exceptions';
import { CLAIM, CLAIM_METHOD_TO_DB } from '../../config/claims.constants';
import { ClaimTransferWriterService } from '../claim-transfer-writer.service';
import { StreamerClaimService } from '../streamer-claim.service';
import { streamerProfileRow } from './streamers.fixtures';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const USER = 'user-1';
const DEAD_STATUSES: StreamerInvitation['status'][] = ['accepted', 'declined'];
const SLUG = 'jove';

const INVITATION_CHANNELS = [
  { platform: 'twitch', url: 'https://www.twitch.tv/Jove' },
  { platform: 'telegram', url: 'https://t.me/jove' },
  { platform: 'vkVideoLive', url: 'https://live.vkvideo.ru/jove_live' }
];

const invitation = (overrides: Partial<StreamerInvitation> = {}): StreamerInvitation => ({
  id: 'inv-1',
  slug: SLUG,
  displayName: 'Jove',
  channels: INVITATION_CHANNELS,
  sourceUrl: null,
  status: 'pending',
  sentAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides
});

const claim = (overrides: Partial<StreamerClaim> = {}): StreamerClaim => ({
  id: 'claim-1',
  profileId: null,
  invitationId: 'inv-1',
  userId: USER,
  method: 'bioCode',
  platform: null,
  code: 'otmetki-abc123',
  status: 'open',
  evidence: null,
  resolvedBy: null,
  createdAt: NOW,
  resolvedAt: null,
  ...overrides
});

const channel = (overrides: Partial<StreamerChannel> = {}): StreamerChannel => ({
  id: 'ch-1',
  profileId: 'target',
  platform: 'youtube',
  handle: '@jove',
  url: 'https://youtube.com/@jove',
  externalId: null,
  verifiedAt: null,
  sourceUrl: null,
  createdAt: NOW,
  ...overrides
});

const integration = (login: string): StreamerIntegration => ({
  id: 'int-1',
  userId: USER,
  provider: 'twitch',
  externalId: '42',
  accessToken: 'a',
  refreshToken: 'r',
  tokenExpiresAt: null,
  scope: null,
  config: { login },
  createdAt: NOW,
  updatedAt: NOW
});

const SETTINGS = { camera: { fov: 95, source: 'creator', sourceUrl: null, checkedAt: NOW.toISOString() } };

const createdClaim = (prisma: ReturnType<typeof mockDeep<PrismaService>>, index = 0) => prisma.streamerClaim.create.mock.calls[index]?.[0].data;

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const profiles = mock<StreamerProfileService>();
  const platforms = mock<LivePlatformsService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.streamerProfile.findUnique.mockResolvedValue(null);
  prisma.streamerInvitation.findUnique.mockResolvedValue(invitation());
  prisma.streamerInvitation.update.mockResolvedValue(invitation({ status: 'accepted' }));
  prisma.streamerProfile.create.mockResolvedValue(mock<StreamerProfile>({ id: 'new-profile' }));
  prisma.streamerChannel.findMany.mockResolvedValue([]);
  prisma.streamerClaim.create.mockResolvedValue(claim());
  prisma.streamerClaim.update.mockResolvedValue(claim({ status: 'resolved', resolvedAt: NOW }));

  return { service: new StreamerClaimService(prisma, new ClaimTransferWriterService(prisma, profiles), platforms), prisma, profiles, platforms };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamerClaimService.start', () => {
  it('rejects a slug with neither a profile nor an invitation', async () => {
    const { service, prisma } = createService();

    prisma.streamerInvitation.findUnique.mockResolvedValue(null);

    await expect(service.start({ userId: USER, slug: SLUG, method: 'manual' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it.each(DEAD_STATUSES)('rejects an invitation that was already %s', async (status) => {
    const { service, prisma } = createService();

    prisma.streamerInvitation.findUnique.mockResolvedValue(invitation({ status }));

    await expect(service.start({ userId: USER, slug: SLUG, method: 'manual' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('refuses to claim an existing profile while editorial entries are disabled', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ id: 'p1', kind: 'editorial', hiddenAt: null }));

    await expect(service.start({ userId: USER, slug: SLUG, method: 'manual' })).rejects.toBeInstanceOf(AppConflictException);
  });

  it('issues a fresh prefixed code for a bio claim and leaves it open', async () => {
    const { service, prisma } = createService();

    const view = await service.start({ userId: USER, slug: SLUG, method: 'bio_code' });

    expect(createdClaim(prisma)?.code?.startsWith(CLAIM.codePrefix)).toBe(true);
    expect(createdClaim(prisma)?.method).toBe(CLAIM_METHOD_TO_DB.bio_code);
    expect(view.method).toBe('bio_code');
    expect(view.status).toBe('open');

    expect(prisma.streamerClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ invitationId: 'inv-1', userId: USER }) })
    );
  });

  it('gives two bio claims different codes', async () => {
    const { service, prisma } = createService();

    await service.start({ userId: USER, slug: SLUG, method: 'bio_code' });
    await service.start({ userId: USER, slug: SLUG, method: 'bio_code' });

    expect(createdClaim(prisma, 0)?.code).not.toBe(createdClaim(prisma, 1)?.code);
  });

  it('stores the evidence of a manual claim without a code', async () => {
    const { service, prisma } = createService();

    await service.start({ userId: USER, slug: SLUG, method: 'manual', evidence: 'screenshot link' });

    expect(prisma.streamerClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ evidence: 'screenshot link', code: null }) })
    );
  });

  it('forbids an OAuth claim when the connected Twitch login is not among the channels', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration('someone_else'));

    await expect(service.start({ userId: USER, slug: SLUG, method: 'oauth' })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.streamerClaim.create).not.toHaveBeenCalled();
  });

  it('forbids an OAuth claim when no Twitch account is connected', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(null);

    await expect(service.start({ userId: USER, slug: SLUG, method: 'oauth' })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('resolves an OAuth claim at once when the Twitch login matches regardless of case', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration('JOVE'));

    const view = await service.start({ userId: USER, slug: SLUG, method: 'oauth' });

    expect(view.status).toBe('resolved');
    expect(prisma.streamerInvitation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'accepted' } }));

    expect(prisma.streamerChannel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'new-profile', platform: 'twitch' },
        data: { verifiedAt: NOW }
      })
    );
  });
});

describe('StreamerClaimService.start contested OAuth claims', () => {
  it('lets an OAuth-proven owner through an open unverified code or manual claim by someone else', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration('jove'));
    prisma.streamerClaim.count.mockResolvedValue(0);
    prisma.streamerChannel.count.mockResolvedValue(0);

    await service.start({ userId: USER, slug: SLUG, method: 'oauth' });

    expect(prisma.streamerClaim.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: { not: USER }, status: 'open', method: 'oauth' })
    });
  });

  it('sends an OAuth claim to moderation while another user has an open OAuth claim on the page', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration('jove'));
    prisma.streamerClaim.count.mockResolvedValue(1);
    prisma.streamerChannel.count.mockResolvedValue(0);

    const view = await service.start({ userId: USER, slug: SLUG, method: 'oauth' });

    expect(view.status).toBe('open');
    expect(prisma.streamerInvitation.update).not.toHaveBeenCalled();
    expect(prisma.streamerClaim.update).not.toHaveBeenCalled();
  });

  it('sends an OAuth claim to moderation when the Twitch channel is already verified on another page', async () => {
    const { service, prisma } = createService();

    prisma.streamerIntegration.findUnique.mockResolvedValue(integration('JOVE'));
    prisma.streamerClaim.count.mockResolvedValue(0);
    prisma.streamerChannel.count.mockResolvedValue(1);

    const view = await service.start({ userId: USER, slug: SLUG, method: 'oauth' });

    expect(view.status).toBe('open');
    expect(prisma.streamerChannel.count).toHaveBeenCalledWith({ where: expect.objectContaining({ platform: 'twitch', handle: 'jove' }) });
    expect(prisma.streamerInvitation.update).not.toHaveBeenCalled();
  });
});

describe('StreamerClaimService.verify', () => {
  it('fails when the user has no open code claim', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findFirst.mockResolvedValue(null);

    await expect(service.verify({ userId: USER, slug: SLUG })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('keeps the claim open when no channel description carries the code', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerClaim.findFirst.mockResolvedValue(claim());
    platforms.twitchDescription.mockResolvedValue('just a streamer');
    platforms.vkDescription.mockResolvedValue(null);

    const view = await service.verify({ userId: USER, slug: SLUG });

    expect(view.status).toBe('open');
    expect(prisma.streamerClaim.update).not.toHaveBeenCalled();
  });

  it('verifies the platform whose description carries the code in any case', async () => {
    const { service, prisma, platforms } = createService();
    const open = claim();

    prisma.streamerClaim.findFirst.mockResolvedValue(open);
    platforms.twitchDescription.mockResolvedValue('nothing here');
    platforms.vkDescription.mockResolvedValue(`Code: ${open.code?.toUpperCase()}`);

    const view = await service.verify({ userId: USER, slug: SLUG });

    expect(view.status).toBe('resolved');

    expect(prisma.streamerChannel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'new-profile', platform: 'vkVideoLive' },
        data: { verifiedAt: NOW }
      })
    );
  });

  it('treats a failed description lookup as no match and checks the next channel', async () => {
    const { service, prisma, platforms } = createService();
    const open = claim();

    prisma.streamerClaim.findFirst.mockResolvedValue(open);
    platforms.twitchDescription.mockRejectedValue(new Error('twitch down'));
    platforms.vkDescription.mockResolvedValue(`${open.code}`);

    const view = await service.verify({ userId: USER, slug: SLUG });

    expect(view.status).toBe('resolved');
  });

  it('looks descriptions up by the handles parsed from the invitation channel urls', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerClaim.findFirst.mockResolvedValue(claim());
    platforms.twitchDescription.mockResolvedValue(null);
    platforms.vkDescription.mockResolvedValue(null);

    await service.verify({ userId: USER, slug: SLUG });

    expect(platforms.twitchDescription).toHaveBeenCalledWith('jove');
    expect(platforms.vkDescription).toHaveBeenCalledWith('jove_live');
  });
});

describe('StreamerClaimService.resolve', () => {
  it('rejects a claim that is no longer open', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ status: 'dismissed' }));

    await expect(service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('rejects an unknown claim', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(null);

    await expect(service.resolve({ id: 'missing', approve: false, moderatorId: 'mod' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('dismisses a rejected claim on behalf of the moderator', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim());

    await service.resolve({ id: 'claim-1', approve: false, moderatorId: 'mod' });

    expect(prisma.streamerClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'claim-1' },
        data: { status: 'dismissed', resolvedAt: NOW, resolvedBy: 'mod' }
      })
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates the profile from an approved invitation and copies its channels', async () => {
    const { service, prisma, profiles } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ method: 'manual', code: null }));

    await service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' });

    expect(prisma.streamerProfile.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: USER, slug: SLUG, displayName: 'Jove' } }));
    expect(profiles.replaceChannels).toHaveBeenCalledWith({ profileId: 'new-profile', channels: INVITATION_CHANNELS });

    expect(prisma.streamerClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'resolved', resolvedBy: 'mod', profileId: 'new-profile' }) })
    );
  });

  it('adds invitation channels to the profile the user already owns', async () => {
    const { service, prisma, profiles } = createService();
    const existing = channel({ profileId: 'own' });

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ method: 'manual' }));
    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ id: 'own' }));
    prisma.streamerChannel.findMany.mockResolvedValue([existing]);

    await service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' });

    expect(prisma.streamerProfile.create).not.toHaveBeenCalled();

    expect(profiles.replaceChannels).toHaveBeenCalledWith({
      profileId: 'own',
      channels: [{ platform: existing.platform, url: existing.url }, ...INVITATION_CHANNELS]
    });
  });

  it('skips channel replacement when the invitation lists no channels', async () => {
    const { service, prisma, profiles } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ method: 'manual' }));
    prisma.streamerInvitation.update.mockResolvedValue(invitation({ status: 'accepted', channels: [] }));

    await service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' });

    expect(profiles.replaceChannels).not.toHaveBeenCalled();
  });

  it('hands an editorial profile over to a user without a profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ invitationId: null, profileId: 'target', method: 'manual' }));
    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(mock<StreamerProfile>({ id: 'target' }));

    await service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' });

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'target' }, data: { userId: USER, kind: 'claimed' } })
    );

    expect(prisma.streamerChannel.updateMany).not.toHaveBeenCalled();
  });

  it('merges an editorial profile into the profile the user already owns', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ invitationId: null, profileId: 'target', method: 'manual' }));
    prisma.streamerProfile.findUnique.mockResolvedValue(streamerProfileRow({ id: 'own' }));
    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(streamerProfileRow({ id: 'target', settings: SETTINGS, settingsUpdatedAt: NOW }));

    await service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' });

    expect(prisma.streamerChannel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: 'target' }, data: { profileId: 'own' } })
    );

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'target' },
        data: { hiddenAt: NOW, mergedIntoId: 'own', settings: Prisma.DbNull, settingsUpdatedAt: null }
      })
    );

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'own' }, data: { settings: SETTINGS, settingsUpdatedAt: NOW } })
    );
  });

  it('keeps the owned profile settings when merging an editorial profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findUnique.mockResolvedValue(claim({ invitationId: null, profileId: 'target', method: 'manual' }));
    prisma.streamerProfile.findUnique.mockResolvedValue(streamerProfileRow({ id: 'own', settings: SETTINGS }));
    prisma.streamerProfile.findUniqueOrThrow.mockResolvedValue(streamerProfileRow({ id: 'target', settings: SETTINGS }));

    await service.resolve({ id: 'claim-1', approve: true, moderatorId: 'mod' });

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'target' }, data: { hiddenAt: NOW, mergedIntoId: 'own' } })
    );

    expect(prisma.streamerProfile.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'own' } }));
  });
});

describe('StreamerClaimService.mine', () => {
  it('returns null when the user never claimed the page', async () => {
    const { service, prisma } = createService();

    prisma.streamerClaim.findFirst.mockResolvedValue(null);

    await expect(service.mine({ userId: USER, slug: SLUG })).resolves.toBeNull();
  });
});

describe('StreamerClaimService.pending', () => {
  it('labels each open claim with the slug of its profile or invitation', async () => {
    const { service, prisma } = createService();

    const rows = [
      { ...claim({ id: 'a', invitationId: null, profileId: 'p' }), profile: { slug: 'from-profile' }, invitation: null },
      { ...claim({ id: 'b', evidence: 'proof' }), profile: null, invitation: { slug: 'from-invitation' } }
    ];

    prisma.streamerClaim.findMany.mockResolvedValue(rows);

    const claims = await service.pending();

    expect(claims.map(({ slug }) => slug)).toEqual(['from-profile', 'from-invitation']);
    expect(claims[1]?.evidence).toBe('proof');
  });
});
