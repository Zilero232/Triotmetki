import { ROUTES } from '@/shared/constants';

export const MOD_FAQ = [
  { id: 'ban' },
  { id: 'patch' },
  { id: 'conflicts' },
  { id: 'perf' },
  { id: 'remove' },
  { id: 'bind', link: { href: ROUTES.account.overview, label: 'accountLink' } },
  { id: 'replays', link: { href: ROUTES.replays.list, label: 'replaysLink' } },
  { id: 'delete', link: { href: ROUTES.account.overview, label: 'accountLink' } }
] as const satisfies readonly { id: string; link?: { href: string; label: 'accountLink' | 'replaysLink' } }[];
