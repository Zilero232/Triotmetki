export const PAGE_IDS = ['home', 'install', 'components', 'sets', 'profiles', 'settings', 'account', 'help', 'changelog', 'about'] as const;

export const PAGES = {
  initial: 'home'
} as const;

export const PAGE_SECTIONS = {
  home: { pages: ['home', 'install'], tabs: false },
  components: { pages: ['components'], tabs: false },
  sets: { pages: ['sets'], tabs: false },
  profiles: { pages: ['profiles'], tabs: false },
  settings: { pages: ['settings', 'account', 'about'], tabs: true },
  help: { pages: ['help', 'changelog'], tabs: true }
} as const;
