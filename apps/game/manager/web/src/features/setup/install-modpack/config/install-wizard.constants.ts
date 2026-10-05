export const INSTALL_WIZARD = {
  steps: ['client', 'components', 'otherMods', 'review'],
  customPreset: 'custom',
  profileExtensions: ['ini']
} as const;

export const BLOCKER_MESSAGES = {
  client: 'clientUnsupported',
  noCatalog: 'noCatalog',
  offline: 'source.offline',
  unavailable: 'source.unavailable'
} as const;
