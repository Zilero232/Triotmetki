import type { StreamerPlatform } from '@otmetki/schemas';

import { CHANNEL_HOSTS, STREAMER_PLATFORMS } from '@otmetki/schemas';
import { isIncludedIn } from 'remeda';

import { readRecord } from '../src/common/lib';
import { validateEnv } from '../src/config';
import { createPrismaClient } from '../src/core/prisma';
import { parseChannel, STREAMER_INVITATIONS } from '../src/modules/streamers/profiles';

const env = validateEnv(process.env);
const prisma = createPrismaClient({ url: env.DATABASE_URL, pool: { max: 2 } });

const platformOf = (url: string): StreamerPlatform | null => {
  try {
    const host = new URL(url).hostname.toLowerCase();

    return STREAMER_PLATFORMS.find((platform) => isIncludedIn(host, CHANNEL_HOSTS[platform])) ?? null;
  } catch {
    return null;
  }
};

const copyLinks = async (): Promise<number> => {
  const profiles = await prisma.streamerProfile.findMany({ where: { links: { not: { equals: null } } }, include: { channels: true } });
  let created = 0;

  for (const profile of profiles) {
    for (const url of Object.values(readRecord(profile.links))) {
      const platform = typeof url === 'string' ? platformOf(url) : null;
      const channel = platform && typeof url === 'string' ? parseChannel({ platform, url }) : null;

      if (!channel || profile.channels.some((existing) => existing.platform === channel.platform && existing.handle === channel.handle)) {
        continue;
      }

      const taken = await prisma.streamerChannel.count({ where: { platform: channel.platform, handle: channel.handle } });

      if (taken === 0) {
        await prisma.streamerChannel.create({ data: { profileId: profile.id, ...channel } });
        created += 1;
      }
    }
  }

  return created;
};

const seedInvitations = async (): Promise<void> => {
  for (const invitation of STREAMER_INVITATIONS) {
    await prisma.streamerInvitation.upsert({
      where: { slug: invitation.slug },
      create: { slug: invitation.slug, displayName: invitation.displayName, sourceUrl: invitation.sourceUrl, channels: [...invitation.channels] },
      update: {}
    });
  }
};

const channels = await copyLinks();

await seedInvitations();

console.info(`streamers: ${channels} channels copied from links, ${STREAMER_INVITATIONS.length} invitations seeded`);

await prisma.$disconnect();
