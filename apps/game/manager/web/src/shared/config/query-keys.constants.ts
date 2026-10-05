export const QUERY_KEYS = {
  appInfo: ['app-info'],
  appUpdate: ['app-update'],
  catalog: ['catalog'],
  clients: ['clients'],
  settings: ['settings'],
  patchReport: ['patch-report'],
  installation: (clientPath: string | null) => ['installation', clientPath],
  installPlan: (clientPath: string | null) => ['install-plan', clientPath],
  profiles: (clientPath: string | null) => ['profiles', clientPath],
  conflicts: (clientPath: string | null) => ['conflicts', clientPath],
  sets: ['sets'],
  cachePlan: (clientPath: string | null) => ['cache-plan', clientPath],
  accountLink: ['account-link'],
  syncStatus: (clientPath: string | null) => ['sync-status', clientPath],
  whatsNew: (clientPath: string | null) => ['whats-new', clientPath],
  reportPreview: (clientPath: string | null) => ['report-preview', clientPath],
  gameHealth: (clientPath: string | null) => ['game-health', clientPath]
} as const;
