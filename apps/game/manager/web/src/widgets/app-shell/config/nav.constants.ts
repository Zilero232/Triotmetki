import { Boxes, CircleHelp, Home, Layers, Settings, SlidersHorizontal } from 'lucide-react';

export const NAV_ICONS = {
  home: Home,
  components: Layers,
  sets: Boxes,
  profiles: SlidersHorizontal,
  settings: Settings,
  help: CircleHelp
} as const;

export const NAV_GROUPS = [
  { id: 'overview', sections: ['home'], hasLabel: false },
  { id: 'modpack', sections: ['components', 'sets', 'profiles'], hasLabel: true },
  { id: 'app', sections: ['settings', 'help'], hasLabel: true }
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
