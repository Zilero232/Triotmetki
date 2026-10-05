export const ENV_GUARD = {
  localHosts: ['localhost', '127.0.0.1', '[::1]'],
  localSuffix: '.localhost',
  weakSecret: /change-?me|dev-secret|dev-mod-secret|test-secret|example|placeholder/iu,
  productionSecrets: ['BETTER_AUTH_SECRET', 'MOD_INGEST_SECRET', 'INTERNAL_API_TOKEN', 'TOKEN_ENCRYPTION_SECRET']
} as const;
