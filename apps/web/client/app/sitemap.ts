import type { MetadataRoute } from 'next';

import { PLAY_MODES } from '@otmetki/schemas';
import { isIncludedIn } from 'remeda';

import type { SitemapProps, SitemapSection } from '@/shared/seo';

import { blogSitemapItems } from '@/entities/blog/post/server';
import { topClanTags } from '@/entities/clan/clan/server';
import { coachIds } from '@/entities/coaching/coach/server';
import { competitionSlugs } from '@/entities/competition/competition/server';
import { guideSitemapItems } from '@/entities/guide/guide/server';
import { mapSlugs } from '@/entities/map/map/server';
import { missionOperationRefs } from '@/entities/mission/mission/server';
import { popularNicknames } from '@/entities/player/profile/server';
import { publicReplayIds } from '@/entities/replay/replay/server';
import { streamerSlugs } from '@/entities/streamer/streamer/server';
import { TANK_COLLECTION_SLUGS } from '@/entities/tank/tank';
import { vehicleSlugs } from '@/entities/tank/tank/server';
import { tournamentSlugs } from '@/entities/tournament/tournament/server';
import { ROUTES } from '@/shared/constants';
import { SITEMAP, SITEMAP_STATIC_PATHS, sitemapContentEntries, sitemapEntries } from '@/shared/seo';

const pages = async () =>
  sitemapEntries([
    ...SITEMAP_STATIC_PATHS,
    ...PLAY_MODES.map((mode) => ROUTES.modes.detail(mode)),
    ...TANK_COLLECTION_SLUGS.map((slug) => ROUTES.tanks.collection(slug)),
    ...(await missionOperationRefs()).map((ref) => ROUTES.missions.operation(ref))
  ]);

const tanks = async () => {
  const slugs = await vehicleSlugs();

  return sitemapEntries(slugs.flatMap((slug) => [ROUTES.tanks.detail(slug), ROUTES.tanks.armor(slug), ROUTES.builds.detail(slug)]));
};

const players = async () => {
  const [nicknames, streamers] = await Promise.all([popularNicknames({ limit: SITEMAP.limit }), streamerSlugs({ limit: SITEMAP.limit })]);

  return sitemapEntries([
    ...nicknames.map((nickname) => ROUTES.players.profile(nickname)),
    ...streamers.flatMap((slug) => [ROUTES.streamers.profile(slug), ROUTES.streamers.settings.profile(slug)])
  ]);
};

const clans = async () => sitemapEntries((await topClanTags({ limit: SITEMAP.limit })).map((tag) => ROUTES.clans.detail(tag)));

const content = async () => {
  const [maps, replays, tournaments, competitions, coaches, guides, blogPosts] = await Promise.all([
    mapSlugs({}),
    publicReplayIds({ limit: SITEMAP.limit }),
    tournamentSlugs({ limit: SITEMAP.limit }),
    competitionSlugs({ limit: SITEMAP.limit }),
    coachIds({ limit: SITEMAP.limit }),
    guideSitemapItems({ limit: SITEMAP.limit }),
    blogSitemapItems({ limit: SITEMAP.limit })
  ]);

  return [
    ...sitemapEntries([
      ...maps.map((id) => ROUTES.maps.detail(id)),
      ...replays.map((id) => ROUTES.replays.detail(id)),
      ...tournaments.map((slug) => ROUTES.tournaments.detail(slug)),
      ...competitions.map((slug) => ROUTES.competitions.detail(slug)),
      ...coaches.map((id) => ROUTES.coaching.coach(id))
    ]),
    ...sitemapContentEntries(guides.map(({ slug, locale, updatedAt }) => ({ path: ROUTES.guides.detail(slug), locale, lastModified: updatedAt }))),
    ...sitemapContentEntries(blogPosts.map(({ slug, locale, updatedAt }) => ({ path: ROUTES.blog.detail(slug), locale, lastModified: updatedAt })))
  ];
};

const SECTIONS: Record<SitemapSection, () => Promise<MetadataRoute.Sitemap>> = { pages, tanks, players, clans, content };

export const generateSitemaps = () => SITEMAP.sections.map((id) => ({ id }));

const sitemap = async ({ id }: SitemapProps): Promise<MetadataRoute.Sitemap> => {
  const section = await id;

  return isIncludedIn(section, SITEMAP.sections) ? SECTIONS[section]() : [];
};

export default sitemap;
