export const PAGE_IDS = ['home', 'install', 'components', 'sets', 'profiles', 'settings', 'help', 'changelog', 'about'] as const;

export const PAGES = {
  initial: 'home'
} as const;

export const PAGE_SECTIONS = {
  home: { pages: ['home', 'install'], tabs: false },
  components: { pages: ['components'], tabs: false },
  sets: { pages: ['sets', 'profiles'], tabs: true },
  settings: { pages: ['settings', 'about'], tabs: true },
  help: { pages: ['help', 'changelog'], tabs: true }
} as const;
