export const INSTALL_WIZARD = {
  steps: ['client', 'components', 'otherMods', 'review'],
  customPreset: 'custom'
} as const;

export const LAST_WIZARD_STEP = INSTALL_WIZARD.steps.length - 1;

export const BLOCKER_MESSAGES = {
  client: 'clientUnsupported',
  noCatalog: 'noCatalog',
  offline: 'source.offline',
  unavailable: 'source.unavailable'
} as const;
