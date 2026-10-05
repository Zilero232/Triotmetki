import { CircleHelp, Home, Layers, Settings, SlidersHorizontal, UserRound, Wrench } from 'lucide-react';

export const NAV_ICONS = {
  home: Home,
  components: Layers,
  profiles: SlidersHorizontal,
  maintenance: Wrench,
  account: UserRound,
  settings: Settings,
  help: CircleHelp
} as const;

export const NAV_GROUPS = [
  { id: 'overview', sections: ['home'], hasLabel: false },
  { id: 'modpack', sections: ['components', 'profiles', 'maintenance'], hasLabel: true },
  { id: 'app', sections: ['account', 'settings', 'help'], hasLabel: true }
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
