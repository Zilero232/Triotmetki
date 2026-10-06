export const PAGE_IDS = ['home', 'install', 'components', 'profiles', 'updates', 'maintenance', 'account', 'settings', 'help', 'about'] as const;

export const PAGES = {
  initial: 'home'
} as const;

export const PAGE_SECTIONS = {
  home: ['home', 'install'],
  components: ['components'],
  profiles: ['profiles'],
  updates: ['updates'],
  maintenance: ['maintenance'],
  account: ['account'],
  settings: ['settings'],
  help: ['help'],
  about: ['about']
} as const;
