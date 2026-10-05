export const PAGE_IDS = ['home', 'install', 'components', 'profiles', 'maintenance', 'changelog', 'account', 'settings', 'help', 'about'] as const;

export const PAGES = {
  initial: 'home'
} as const;

export const PAGE_SECTIONS = {
  home: { pages: ['home', 'install'], tabs: false },
  components: { pages: ['components'], tabs: false },
  profiles: { pages: ['profiles'], tabs: false },
  maintenance: { pages: ['maintenance', 'changelog'], tabs: true },
  account: { pages: ['account'], tabs: false },
  settings: { pages: ['settings'], tabs: false },
  help: { pages: ['help', 'about'], tabs: true }
} as const;
