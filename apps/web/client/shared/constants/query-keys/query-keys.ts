import type {
  BlogEditorPostKeyInput,
  BlogViewerKeyInput,
  ClanWorkspaceKeyInput,
  GuideDetailKeyInput,
  GuideListKeyInput,
  GuideViewerKeyInput,
  MeSection,
  PlayerSectionKeyInput
} from './query-keys.types';

export const QUERY_KEYS = {
  search: (query: string) => ['search', query] as const,
  player: {
    profile: (idOrNick: string) => ['player', 'profile', idOrNick.toLowerCase()] as const,
    popular: (params: object) => ['player', 'popular', params] as const,
    section: ({ accountId, section, params = {} }: PlayerSectionKeyInput) => ['player', accountId, section, params] as const
  },
  leaderboard: (params: object) => ['leaderboard', params] as const,
  cosmetics: {
    all: ['cosmetics'] as const,
    profile: (accountId: number) => ['cosmetics', 'profile', accountId] as const,
    profiles: (accountIds: readonly number[]) => ['cosmetics', 'profiles', accountIds] as const
  },
  seasons: (accountId: number) => ['seasons', accountId] as const,
  compare: {
    players: (params: object) => ['compare', 'players', params] as const,
    tanks: (tankIds: readonly number[]) => ['compare', 'tanks', tankIds] as const
  },
  modes: {
    hub: ['modes', 'hub'] as const,
    meta: (params: object) => ['modes', 'meta', params] as const,
    mine: (days: number) => ['me', 'modes', days] as const
  },
  watchlist: (period: string) => ['me', 'watchlist', period] as const,
  competitions: {
    list: (params: object) => ['competitions', 'list', params] as const,
    detail: (params: object) => ['competitions', 'detail', params] as const
  },
  tanks: {
    stats: (params: object) => ['tanks', 'stats', params] as const,
    tierList: (params: object) => ['tanks', 'tier-list', params] as const,
    catalog: ['tanks', 'catalog'] as const,
    detail: (params: object) => ['tanks', 'detail', params] as const,
    topPlayers: (params: object) => ['tanks', 'top-players', params] as const,
    trend: (tankId: number) => ['tanks', tankId, 'trend'] as const,
    patches: (tankId: number) => ['tanks', tankId, 'patches'] as const,
    maps: (tankId: number) => ['tanks', tankId, 'maps'] as const,
    armor: (idOrSlug: string) => ['tanks', 'armor', idOrSlug] as const,
    armorShowcase: (idOrSlug: string) => ['tanks', 'armor-showcase', idOrSlug] as const,
    armorGuns: (idOrSlug: string) => ['tanks', 'armor-guns', idOrSlug] as const,
    economy: (params: object) => ['tanks', 'economy', params] as const,
    tankEconomy: (tankId: number) => ['tanks', tankId, 'economy'] as const,
    myEconomy: (days: number) => ['me', 'tanks', 'economy', days] as const,
    myLearning: (tankId: number) => ['me', 'tanks', tankId, 'learning-curve'] as const
  },
  marks: {
    list: (params: object) => ['marks', 'list', params] as const,
    feed: (params: object) => ['marks', 'feed', params] as const,
    history: (tankId: number) => ['marks', tankId, 'history'] as const,
    curve: (tankId: number) => ['marks', tankId, 'curve'] as const,
    player: (accountId: number) => ['marks', 'player', accountId] as const
  },
  builds: {
    options: (tankId: number) => ['builds', tankId, 'options'] as const,
    stats: (params: object) => ['builds', 'stats', params] as const,
    popular: (tankId: number) => ['builds', tankId, 'popular'] as const,
    recommended: (params: object) => ['builds', 'recommended', params] as const,
    history: (params: object) => ['builds', 'history', params] as const,
    catalog: (params: object) => ['builds', 'catalog', params] as const
  },
  tree: (nation: string) => ['tree', nation] as const,
  pulse: ['pulse'] as const,
  modpack: {
    status: ['modpack', 'status'] as const,
    changelog: (limit: number) => ['modpack', 'changelog', limit] as const
  },
  reference: {
    version: ['reference', 'version'] as const,
    servers: ['reference', 'servers'] as const,
    health: ['reference', 'health'] as const
  },
  events: {
    calendar: ['events', 'calendar'] as const
  },
  clans: {
    list: (params: object) => ['clans', 'list', params] as const,
    feed: (params: object) => ['clans', 'feed', params] as const,
    page: (idOrTag: string) => ['clans', 'page', idOrTag.toLowerCase()] as const,
    events: (params: object) => ['clans', 'events', params] as const,
    stronghold: (clanId: number) => ['clans', clanId, 'stronghold'] as const
  },
  missions: {
    campaigns: ['missions', 'campaigns'] as const,
    operation: (params: object) => ['missions', 'operation', params] as const,
    tanks: (params: object) => ['missions', 'tanks', params] as const,
    garage: (questId: number) => ['me', 'missions', 'garage', questId] as const,
    progress: ['me', 'missions', 'progress'] as const,
    plans: ['me', 'missions', 'plan'] as const,
    plan: (operation: number) => ['me', 'missions', 'plan', operation] as const
  },
  maps: {
    list: ['maps', 'list'] as const,
    detail: (id: string) => ['maps', 'detail', id] as const,
    tanks: (id: string) => ['maps', 'tanks', id] as const
  },
  userScoped: [
    ['me'],
    ['tanks', 'armor'],
    ['replays'],
    ['competitions'],
    ['tactics', 'board'],
    ['coaching', 'orders'],
    ['streamers', 'claim'],
    [{ _id: 'supertestControllerMine' }]
  ] as const,
  auth: {
    session: ['auth', 'session'] as const,
    telegramWidget: ['auth', 'telegram-widget'] as const
  },
  me: {
    all: ['me'] as const,
    section: (section: MeSection) => ['me', section] as const,
    developer: {
      overview: ['me', 'developer', 'overview'] as const,
      keys: ['me', 'developer', 'keys'] as const,
      usage: (params: object) => ['me', 'developer', 'usage', params] as const,
      errors: (keyId: string) => ['me', 'developer', 'errors', keyId] as const,
      webhooks: ['me', 'developer', 'webhooks'] as const,
      deliveries: (webhookId: string) => ['me', 'developer', 'deliveries', webhookId] as const
    },
    billing: {
      status: ['me', 'billing', 'status'] as const,
      history: ['me', 'billing', 'history'] as const
    },
    inbox: (params: object) => ['me', 'inbox', params] as const,
    usage: ['me', 'usage'] as const,
    analytics: {
      all: ['me', 'analytics'] as const,
      overview: (params: object) => ['me', 'analytics', 'overview', params] as const,
      tank: (params: object) => ['me', 'analytics', 'tank', params] as const,
      maps: (params: object) => ['me', 'analytics', 'maps', params] as const,
      platoons: (params: object) => ['me', 'analytics', 'platoons', params] as const,
      rng: (params: object) => ['me', 'analytics', 'rng', params] as const,
      battles: (params: object) => ['me', 'analytics', 'battles', params] as const,
      battle: (id: string) => ['me', 'analytics', 'battle', id] as const,
      analysis: (id: string) => ['me', 'analytics', 'battle', id, 'analysis'] as const,
      playlist: (params: object) => ['me', 'analytics', 'playlist', params] as const,
      firstWin: (params: object) => ['me', 'analytics', 'first-win', params] as const
    },
    telegram: ['me', 'telegram'] as const,
    progression: {
      all: ['me', 'progression'] as const,
      tanks: ['me', 'progression', 'tanks'] as const,
      challenges: ['me', 'progression', 'challenges'] as const,
      season: ['me', 'progression', 'season'] as const,
      shells: ['me', 'progression', 'shells'] as const
    },
    cosmetics: ['me', 'cosmetics'] as const,
    streamer: {
      profile: ['me', 'streamer', 'profile'] as const,
      overlays: ['me', 'streamer', 'overlays'] as const,
      challenges: ['me', 'streamer', 'challenges'] as const,
      integrations: ['me', 'streamer', 'integrations'] as const,
      settings: ['me', 'streamer', 'settings'] as const,
      settingsShare: ['me', 'streamer', 'settings-share'] as const,
      follows: ['me', 'streamer', 'follows'] as const
    }
  },
  billing: {
    plans: ['billing', 'plans'] as const
  },
  social: {
    follows: ['me', 'social', 'follows'] as const,
    feed: (params: object) => ['me', 'social', 'feed', params] as const,
    league: (params: object) => ['me', 'social', 'league', params] as const,
    challenges: ['me', 'social', 'challenges'] as const
  },
  clanWorkspace: {
    all: (clanId: number) => ['me', 'clan-workspace', clanId] as const,
    workspace: (clanId: number) => ['me', 'clan-workspace', clanId, 'workspace'] as const,
    events: ({ clanId, params }: ClanWorkspaceKeyInput) => ['me', 'clan-workspace', clanId, 'events', params] as const,
    candidates: ({ clanId, params }: ClanWorkspaceKeyInput) => ['me', 'clan-workspace', clanId, 'candidates', params] as const,
    report: (clanId: number) => ['me', 'clan-workspace', clanId, 'report'] as const
  },
  notifications: {
    pushKey: ['notifications', 'push-key'] as const
  },
  replays: {
    all: ['replays'] as const,
    list: (params: object) => ['replays', 'list', params] as const,
    mine: (params: object) => ['replays', 'mine', params] as const,
    detail: (id: string) => ['replays', 'detail', id] as const,
    tracks: (id: string) => ['replays', 'tracks', id] as const,
    heatmap: (params: object) => ['replays', 'heatmap', params] as const,
    versions: ['replays', 'versions'] as const
  },
  tactics: {
    all: ['tactics'] as const,
    mine: ['me', 'tactics'] as const,
    board: (params: object) => ['tactics', 'board', params] as const
  },
  guides: {
    all: ['guides'] as const,
    list: ({ viewerId, params }: GuideListKeyInput) => ['guides', 'list', viewerId, params] as const,
    mine: ({ viewerId }: GuideViewerKeyInput) => ['guides', 'mine', viewerId] as const,
    authors: ['guides', 'authors'] as const,
    bySlug: (slug: string) => ['guides', 'detail', slug] as const,
    detail: ({ viewerId, slug }: GuideDetailKeyInput) => ['guides', 'detail', slug, viewerId] as const
  },
  blog: {
    all: ['blog'] as const,
    list: (params: object) => ['blog', 'list', params] as const,
    article: (slug: string) => ['blog', 'article', slug] as const,
    tags: ['blog', 'tags'] as const,
    access: ({ viewerId }: BlogViewerKeyInput) => ['blog', 'access', viewerId] as const,
    editor: {
      list: ({ viewerId }: BlogViewerKeyInput) => ['blog', 'editor', 'list', viewerId] as const,
      post: ({ viewerId, id }: BlogEditorPostKeyInput) => ['blog', 'editor', 'post', id, viewerId] as const
    }
  },
  comments: (params: object) => ['comments', params] as const,
  platoons: {
    all: ['platoons'] as const,
    list: (params: object) => ['platoons', 'list', params] as const
  },
  recruiting: {
    all: ['recruiting'] as const,
    list: (params: object) => ['recruiting', 'list', params] as const
  },
  coaching: {
    all: ['coaching'] as const,
    list: (params: object) => ['coaching', 'list', params] as const,
    coach: (userId: string) => ['coaching', 'coach', userId] as const,
    orders: ['coaching', 'orders'] as const
  },
  tournaments: {
    all: ['tournaments'] as const,
    lists: ['tournaments', 'list'] as const,
    list: (params: object) => ['tournaments', 'list', params] as const,
    detail: (slug: string) => ['tournaments', 'detail', slug] as const
  },
  streamers: {
    profile: (slug: string) => ['streamers', 'profile', slug.toLowerCase()] as const,
    overlay: (publicId: string) => ['streamers', 'overlay', publicId] as const,
    directory: (filters: Record<string, unknown>) => ['streamers', 'directory', filters] as const,
    live: ['streamers', 'live'] as const,
    settings: (slug: string) => ['streamers', 'settings', slug.toLowerCase()] as const,
    settingsHistory: (slug: string) => ['streamers', 'settings-history', slug.toLowerCase()] as const,
    settingsTable: ['streamers', 'settings-table'] as const,
    settingsCompare: (slugs: readonly string[]) => ['streamers', 'settings-compare', ...slugs] as const,
    settingsAggregates: (cohort: string) => ['streamers', 'settings-aggregates', cohort] as const,
    claim: (slug: string) => ['streamers', 'claim', slug.toLowerCase()] as const
  },
  bestBattles: {
    all: ['best-battles'] as const,
    list: (params: object) => ['best-battles', 'list', params] as const,
    facets: (period: string) => ['best-battles', 'facets', period] as const
  },
  honestRng: {
    all: ['honest-rng'] as const,
    server: (params: object) => ['honest-rng', 'server', params] as const,
    mine: (params: object) => ['honest-rng', 'mine', params] as const
  },
  mapStats: {
    all: ['map-stats'] as const,
    rotation: (params: object) => ['map-stats', 'rotation', params] as const,
    queue: (params: object) => ['map-stats', 'queue', params] as const
  },
  tankMath: {
    detail: (tankId: number) => ['tank-math', tankId] as const
  },
  achievementsRarity: {
    all: ['achievements-rarity'] as const,
    catalog: (params: object) => ['achievements-rarity', 'catalog', params] as const,
    tanks: (params: object) => ['achievements-rarity', 'tanks', params] as const,
    leaderboard: (params: object) => ['achievements-rarity', 'leaderboard', params] as const,
    player: (accountId: number) => ['achievements-rarity', 'player', accountId] as const
  },
  supertest: {
    all: ['supertest'] as const,
    list: (params: object) => ['supertest', 'list', params] as const,
    detail: (id: string) => ['supertest', 'detail', id] as const,
    mine: ['supertest', 'mine'] as const
  }
} as const;
