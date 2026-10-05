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
  { id: 'modpack', sections: ['home', 'components', 'sets', 'profiles'] },
  { id: 'app', sections: ['settings', 'help'] }
] as const;

export const NAV_MARKER = {
  problemTones: ['danger', 'warning']
} as const;
