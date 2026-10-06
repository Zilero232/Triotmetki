import { CircleHelp, Home, Info, Layers, RefreshCw, Settings, SlidersHorizontal, UserRound, Wrench } from 'lucide-react';

export const NAV_ICONS = {
  home: Home,
  components: Layers,
  profiles: SlidersHorizontal,
  updates: RefreshCw,
  maintenance: Wrench,
  account: UserRound,
  settings: Settings,
  help: CircleHelp,
  about: Info
} as const;

export const NAV_GROUPS = [
  { id: 'overview', sections: ['home'], isLabelShown: false, isPinned: false },
  { id: 'modpack', sections: ['components', 'profiles', 'updates', 'maintenance'], isLabelShown: true, isPinned: false },
  { id: 'app', sections: ['account', 'settings'], isLabelShown: true, isPinned: false },
  { id: 'support', sections: ['help', 'about'], isLabelShown: false, isPinned: true }
] as const;

export const NAV_MARKER = {
  problemKinds: ['unsupported', 'failed']
} as const;

export const NAV_KEYS = {
  next: ['ArrowDown', 'ArrowRight'],
  previous: ['ArrowUp', 'ArrowLeft'],
  first: 'Home',
  last: 'End',
  shortcutModifier: 'Ctrl',
  ariaShortcutModifier: 'Control'
} as const;

export const NAV_SELECTORS = {
  container: 'nav',
  item: 'button[data-nav-item]'
} as const;
