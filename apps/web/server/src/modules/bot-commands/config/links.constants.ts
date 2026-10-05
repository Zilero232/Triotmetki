export const SITE_LINKS = {
  player: '/p/{nickname}',
  tank: '/t/{slug}',
  clan: '/c/{tag}',
  missions: '/missions/{campaign}/{operation}',
  settings: '/me',
  analytics: '/me/analytics',
  statCard: '/api/og/player/{accountId}'
} as const;

export const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
