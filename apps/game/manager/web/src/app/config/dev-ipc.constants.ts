export const DEV_IPC = {
  queryFlag: 'mock',
  defaultScenario: 'installed',
  scenarios: ['fresh', 'installed', 'update', 'migrate', 'offline', 'no-game'],
  statusByScenario: {
    fresh: 'not_installed',
    installed: 'up_to_date',
    update: 'update_available',
    migrate: 'migration_ready',
    offline: 'offline',
    'no-game': 'no_client'
  }
} as const;
