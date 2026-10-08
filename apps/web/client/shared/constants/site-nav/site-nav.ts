import { GlobalMapIcon, HeavyTankIcon, Mark3Icon, RadioIcon, StrongholdIcon, TrainingIcon } from '@otmetki/icons';
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Code2,
  Compass,
  Crown,
  Dices,
  Download,
  Film,
  Flag,
  Flame,
  FlaskConical,
  Gamepad2,
  GitCompareArrows,
  GraduationCap,
  HeartPulse,
  LayoutGrid,
  ListChecks,
  MapIcon,
  Medal,
  Network,
  Newspaper,
  NotebookPen,
  Scale,
  ShoppingCart,
  Sigma,
  Swords,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  Wrench
} from 'lucide-react';
import { isIncludedIn } from 'remeda';

import type { SiteFooterAction, SiteNavGroup, SiteNavLink } from './site-nav.types';

import { ROUTES } from '../routes';

export const SITE_LINKS = {
  players: { key: 'players', href: ROUTES.players.list, icon: Users },
  top: { key: 'top', href: ROUTES.top, icon: Trophy },
  clans: { key: 'clans', href: ROUTES.clans.list, icon: StrongholdIcon },
  comparePlayers: { key: 'comparePlayers', href: ROUTES.players.compare, icon: GitCompareArrows },
  bestBattles: { key: 'bestBattles', href: ROUTES.bestBattles, icon: Flame },
  achievements: { key: 'achievements', href: ROUTES.achievements, icon: Medal },
  honestRng: { key: 'honestRng', href: ROUTES.honestRng, icon: Dices },
  platoons: { key: 'platoons', href: ROUTES.platoons, icon: UsersRound },
  recruiting: { key: 'recruiting', href: ROUTES.recruiting, icon: UserPlus },
  coaching: { key: 'coaching', href: ROUTES.coaching.list, icon: GraduationCap },
  tactics: { key: 'tactics', href: ROUTES.tactics.list, icon: MapIcon },
  catalog: { key: 'catalog', href: ROUTES.tanks.catalog, icon: LayoutGrid },
  tanks: { key: 'tanks', href: ROUTES.tanks.list, icon: HeavyTankIcon },
  marks: { key: 'marks', href: ROUTES.marks, icon: Mark3Icon },
  builds: { key: 'builds', href: ROUTES.builds.list, icon: Wrench },
  tree: { key: 'tree', href: ROUTES.tree, icon: Network },
  tools: { key: 'tools', href: ROUTES.tools, icon: TrainingIcon },
  compareTanks: { key: 'compareTanks', href: ROUTES.tanks.compare, icon: Scale },
  supertest: { key: 'supertest', href: ROUTES.supertest, icon: FlaskConical },
  missions: { key: 'missions', href: ROUTES.missions.hub, icon: ListChecks },
  events: { key: 'events', href: ROUTES.events, icon: CalendarDays },
  maps: { key: 'maps', href: ROUTES.maps.list, icon: GlobalMapIcon },
  modes: { key: 'modes', href: ROUTES.modes.list, icon: Flag },
  codes: { key: 'codes', href: ROUTES.codes, icon: Ticket },
  shop: { key: 'shop', href: ROUTES.shop, icon: ShoppingCart },
  news: { key: 'news', href: ROUTES.news, icon: Newspaper },
  leagues: { key: 'leagues', href: ROUTES.social.leagues, icon: Award },
  tournaments: { key: 'tournaments', href: ROUTES.tournaments.list, icon: Swords },
  streamers: { key: 'streamers', href: ROUTES.streamers.list, icon: RadioIcon },
  replays: { key: 'replays', href: ROUTES.replays.list, icon: Film },
  guides: { key: 'guides', href: ROUTES.guides.list, icon: BookOpen },
  blog: { key: 'blog', href: ROUTES.blog.list, icon: NotebookPen },
  play: { key: 'play', href: ROUTES.play.hub, icon: Gamepad2 },
  mod: { key: 'mod', href: ROUTES.mod, icon: Download },
  plus: { key: 'plus', href: ROUTES.plus, icon: Crown },
  forStreamers: { key: 'forStreamers', href: ROUTES.streamers.forStreamers, icon: Clapperboard },
  developers: { key: 'developers', href: ROUTES.developers, icon: Code2 },
  pulse: { key: 'pulse', href: ROUTES.pulse, icon: Activity },
  ratings: { key: 'ratings', href: ROUTES.ratings, icon: Sigma },
  status: { key: 'status', href: ROUTES.status, icon: HeartPulse },
  hub: { key: 'hub', href: ROUTES.hub, icon: Compass }
} as const satisfies Record<string, SiteNavLink>;

export const SITE_NAV = {
  menu: [
    {
      key: 'players',
      featured: null,
      items: [SITE_LINKS.players, SITE_LINKS.top, SITE_LINKS.clans, SITE_LINKS.comparePlayers, SITE_LINKS.bestBattles]
    },
    { key: 'vehicles', featured: 'topTank', items: [SITE_LINKS.catalog, SITE_LINKS.tanks, SITE_LINKS.builds, SITE_LINKS.tree, SITE_LINKS.tools] },
    SITE_LINKS.marks,
    { key: 'game', featured: 'currentEvent', items: [SITE_LINKS.missions, SITE_LINKS.events, SITE_LINKS.maps, SITE_LINKS.codes, SITE_LINKS.news] },
    {
      key: 'community',
      featured: 'liveStreamers',
      items: [SITE_LINKS.leagues, SITE_LINKS.tournaments, SITE_LINKS.streamers, SITE_LINKS.replays, SITE_LINKS.guides]
    },
    SITE_LINKS.mod
  ],
  hub: SITE_LINKS.hub,
  plus: SITE_LINKS.plus
} as const satisfies { menu: readonly (SiteNavGroup | SiteNavLink)[]; hub: SiteNavLink; plus: SiteNavLink };

export const SITE_NAV_GROUPS = SITE_NAV.menu.filter((entry) => 'items' in entry);

export const SITE_NAV_LINKS = SITE_NAV.menu.filter((entry) => 'href' in entry);

export const SITE_HUB_GROUPS = [
  {
    key: 'players',
    featured: null,
    items: [SITE_LINKS.players, SITE_LINKS.top, SITE_LINKS.comparePlayers, SITE_LINKS.bestBattles, SITE_LINKS.achievements, SITE_LINKS.honestRng]
  },
  { key: 'clans', featured: null, items: [SITE_LINKS.clans, SITE_LINKS.platoons, SITE_LINKS.recruiting, SITE_LINKS.coaching, SITE_LINKS.tactics] },
  {
    key: 'vehicles',
    featured: null,
    items: [
      SITE_LINKS.catalog,
      SITE_LINKS.tanks,
      SITE_LINKS.marks,
      SITE_LINKS.builds,
      SITE_LINKS.tree,
      SITE_LINKS.compareTanks,
      SITE_LINKS.supertest,
      SITE_LINKS.tools
    ]
  },
  {
    key: 'game',
    featured: null,
    items: [SITE_LINKS.missions, SITE_LINKS.events, SITE_LINKS.maps, SITE_LINKS.modes, SITE_LINKS.codes, SITE_LINKS.shop, SITE_LINKS.news]
  },
  {
    key: 'community',
    featured: null,
    items: [SITE_LINKS.leagues, SITE_LINKS.tournaments, SITE_LINKS.streamers, SITE_LINKS.replays, SITE_LINKS.guides, SITE_LINKS.blog, SITE_LINKS.play]
  },
  {
    key: 'project',
    featured: null,
    items: [SITE_LINKS.mod, SITE_LINKS.plus, SITE_LINKS.forStreamers, SITE_LINKS.developers, SITE_LINKS.pulse, SITE_LINKS.ratings, SITE_LINKS.status]
  }
] as const satisfies readonly SiteNavGroup[];

export const SITE_FOOTER_ACTION_KEYS = ['mod', 'tools', 'plus'] as const;

export const SITE_FOOTER_ACTIONS = [SITE_LINKS.mod, SITE_LINKS.tools, SITE_LINKS.plus] as const satisfies readonly SiteFooterAction[];

export const SITE_FOOTER_COLUMNS = SITE_HUB_GROUPS.map((group) => ({
  ...group,
  items: [...group.items.filter(({ key }) => !isIncludedIn(key, SITE_FOOTER_ACTION_KEYS)), ...(group.key === 'project' ? [SITE_LINKS.hub] : [])]
}));

export const SITE_LEGAL_LINKS = [
  { key: 'contacts', href: ROUTES.legal.contacts },
  { key: 'terms', href: ROUTES.legal.terms },
  { key: 'privacy', href: ROUTES.legal.privacy }
] as const;
