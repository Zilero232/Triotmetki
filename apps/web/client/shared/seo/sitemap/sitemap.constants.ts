import { PAGINATION } from '@otmetki/schemas';

import { ROUTES } from '@/shared/constants';

export const SITEMAP = {
  limit: PAGINATION.maxLimit,
  sections: ['pages', 'tanks', 'players', 'clans', 'content'],
  allow: ['/', '/api/og/'],
  disallow: ['/me', '/api/', '/overlay/', '/serwist/', ROUTES.miniApp, ROUTES.vkMiniApp, ROUTES.auth.login, ROUTES.design, ROUTES.blog.editor.list]
} as const;

export const SITEMAP_STATIC_PATHS = [
  ROUTES.home,
  ROUTES.players.list,
  ROUTES.players.compare,
  ROUTES.top,
  ROUTES.bestBattles,
  ROUTES.achievements,
  ROUTES.clans.list,
  ROUTES.tanks.catalog,
  ROUTES.tanks.list,
  ROUTES.tanks.compare,
  ROUTES.builds.list,
  ROUTES.marks,
  ROUTES.modes.list,
  ROUTES.tree,
  ROUTES.supertest,
  ROUTES.maps.list,
  ROUTES.missions.hub,
  ROUTES.events,
  ROUTES.codes,
  ROUTES.shop,
  ROUTES.news,
  ROUTES.blog.list,
  ROUTES.pulse,
  ROUTES.honestRng,
  ROUTES.play.hub,
  ROUTES.play.guessTank,
  ROUTES.play.guessMap,
  ROUTES.streamers.list,
  ROUTES.streamers.forStreamers,
  ROUTES.streamers.settings.table,
  ROUTES.replays.list,
  ROUTES.guides.list,
  ROUTES.tactics.list,
  ROUTES.platoons,
  ROUTES.recruiting,
  ROUTES.coaching.list,
  ROUTES.tournaments.list,
  ROUTES.tools,
  ROUTES.hub,
  ROUTES.ratings,
  ROUTES.mod,
  ROUTES.plus,
  ROUTES.developers,
  ROUTES.legal.privacy,
  ROUTES.legal.terms,
  ROUTES.legal.contacts
] as const;
