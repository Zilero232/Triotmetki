import { isNonNullish, mapValues, pickBy } from 'remeda';

import type {
  MissionOperationRouteInput,
  PlayerSessionRouteInput,
  PlayerWrappedRouteInput,
  ReplaysFilterRouteInput,
  TanksFilterRouteInput,
  TreeTankRouteInput
} from './routes.types';

import { ROUTE_ANCHORS, ROUTE_PARAMS } from './routes.constants';

export const ROUTES = {
  home: '/',
  design: '/design',
  auth: {
    login: '/login',
    loginNext: (next: string) => `/login?${new URLSearchParams({ [ROUTE_PARAMS.next]: next }).toString()}`,
    telegram: '/login/telegram'
  },
  players: {
    list: '/players',
    profile: (nickname: string) => `/p/${encodeURIComponent(nickname)}`,
    session: ({ nickname, sessionId }: PlayerSessionRouteInput) => `/p/${encodeURIComponent(nickname)}/sessions/${sessionId}`,
    signature: (nickname: string) => `/p/${encodeURIComponent(nickname)}/signature`,
    wrapped: ({ nickname, year }: PlayerWrappedRouteInput) => `/p/${encodeURIComponent(nickname)}/wrapped/${year}`,
    compare: '/compare/players'
  },
  top: '/top',
  bestBattles: '/best-battles',
  achievements: '/achievements',
  tanks: {
    list: '/tanks',
    catalog: '/t',
    filtered: (filter: TanksFilterRouteInput) => {
      const present = pickBy(filter, isNonNullish);
      const query = new URLSearchParams(mapValues(present, String));

      return `/t?${query.toString()}`;
    },
    detail: (slug: string) => `/t/${slug}`,
    armor: (slug: string) => `/t/${slug}/armor`,
    collection: (slug: string) => `/t/collections/${slug}`,
    compare: '/tanks/compare'
  },
  builds: {
    list: '/builds',
    detail: (slug: string) => `/builds/${slug}`
  },
  tree: '/tree',
  treeTank: ({ nation, tankId }: TreeTankRouteInput) => `/tree?${new URLSearchParams({ nation, tank: String(tankId) }).toString()}`,
  supertest: '/supertest',
  marks: '/marks',
  modes: {
    list: '/modes',
    detail: (mode: string) => `/modes/${encodeURIComponent(mode)}`
  },
  maps: {
    list: '/maps',
    rotation: '/maps?tab=rotation',
    detail: (id: string) => `/maps/${encodeURIComponent(id)}`
  },
  play: {
    hub: '/play',
    guessTank: '/play/guess-tank',
    guessMap: '/play/guess-map'
  },
  missions: {
    hub: '/missions',
    operation: ({ campaign, operation }: MissionOperationRouteInput) => `/missions/${campaign}/${operation}`
  },
  clans: {
    list: '/clans',
    detail: (tag: string) => `/c/${encodeURIComponent(tag)}`,
    workspace: (tag: string) => `/c/${encodeURIComponent(tag)}/workspace`
  },
  tools: '/tools',
  hub: '/hub',
  ratings: '/ratings',
  status: '/status',
  codes: '/codes',
  news: '/news',
  shop: '/shop',
  events: '/events',
  pulse: '/pulse',
  honestRng: '/honest-rng',
  streamers: {
    list: '/streamers',
    profile: (slug: string) => `/s/${encodeURIComponent(slug)}`,
    claim: (slug: string) => `/s/${encodeURIComponent(slug)}/claim`,
    overlay: (publicId: string) => `/overlay/${encodeURIComponent(publicId)}`,
    forStreamers: '/for-streamers',
    settings: {
      table: '/streamers/settings',
      compare: '/streamers/settings/compare',
      profile: (slug: string) => `/s/${encodeURIComponent(slug)}/settings`
    }
  },
  developers: '/developers',
  legal: {
    privacy: '/privacy',
    terms: '/terms',
    contacts: '/contacts',
    refund: '/terms#refund'
  },
  mod: '/mod',
  modFeatures: `/mod#${ROUTE_ANCHORS.modFeatures}`,
  modProfile: '/mod/profile',
  plus: '/plus',
  replays: {
    list: '/replays',
    filtered: (filter: ReplaysFilterRouteInput) => {
      const present = pickBy(filter, isNonNullish);
      const query = new URLSearchParams(mapValues(present, String));

      return `/replays?${query.toString()}`;
    },
    detail: (id: string) => `/replays/${encodeURIComponent(id)}`
  },
  tactics: {
    list: '/tactics',
    board: (id: string) => `/tactics/${encodeURIComponent(id)}`
  },
  blog: {
    list: '/blog',
    detail: (slug: string) => `/blog/${encodeURIComponent(slug)}`,
    editor: {
      list: '/blog/editor',
      create: '/blog/editor/new',
      edit: (id: string) => `/blog/editor/${encodeURIComponent(id)}`
    }
  },
  guides: {
    list: '/guides',
    detail: (slug: string) => `/guides/${encodeURIComponent(slug)}`,
    create: '/guides/new',
    edit: (slug: string) => `/guides/${encodeURIComponent(slug)}/edit`
  },
  social: {
    feed: '/feed',
    leagues: '/leagues',
    challenges: '/challenges'
  },
  platoons: '/platoons',
  recruiting: '/recruiting',
  coaching: {
    list: '/coaching',
    coach: (userId: string) => `/coaching/${encodeURIComponent(userId)}`
  },
  tournaments: {
    list: '/tournaments',
    detail: (slug: string) => `/tournaments/${encodeURIComponent(slug)}`,
    points: '/tournaments?tab=points'
  },
  competitions: {
    detail: (slug: string) => `/competitions/${encodeURIComponent(slug)}`
  },
  miniApp: '/tg',
  vkMiniApp: '/vk',
  account: {
    overview: '/me',
    progress: '/me/progress',
    cosmetics: '/me/cosmetics',
    analytics: '/me/analytics',
    analyticsTank: (tankId: number) => `/me/analytics/tanks/${tankId}`,
    battles: '/me/battles',
    battle: (id: string) => `/me/battles/${encodeURIComponent(id)}`,
    developer: '/me/developer',
    billing: '/me/billing',
    notifications: '/me/notifications',
    telegram: '/me/telegram',
    streamer: '/me/streamer',
    watchlist: '/me/watchlist'
  },
  api: {
    playerCard: (accountId: number) => `/api/og/player/${accountId}`,
    siteCard: (locale: string) => `/api/og/site?${new URLSearchParams({ locale }).toString()}`
  },
  sw: '/serwist/sw.js'
} as const;
