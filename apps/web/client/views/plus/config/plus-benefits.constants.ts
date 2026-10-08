import type { PLUS_LIMITS } from '@otmetki/schemas';
import type { LucideIcon } from 'lucide-react';

import { Box, FileDown, FlaskConical, MonitorPlay, Palette, TrendingUp, Trophy, Zap } from 'lucide-react';

export const PLUS_BENEFITS = {
  featured: [
    { id: 'armor3d', icon: Box },
    { id: 'priorityPolling', icon: Zap },
    { id: 'overlays', icon: MonitorPlay },
    { id: 'progression', icon: TrendingUp },
    { id: 'privateCompetitions', icon: Trophy },
    { id: 'analyticsExport', icon: FileDown },
    { id: 'supertestMine', icon: FlaskConical },
    { id: 'cosmetics', icon: Palette }
  ] as const satisfies readonly { id: string; icon: LucideIcon }[]
} as const;

export const PLUS_LIMIT_TIERS = ['free', 'plus'] as const;

export const PLUS_LIMIT_ROWS = [
  'linkedAccounts',
  'goals',
  'watchedTanks',
  'watchedPlayers',
  'overlays',
  'storedReplays',
  'streamerFollows',
  'historyDays'
] as const satisfies readonly (keyof typeof PLUS_LIMITS)[];

export const PLUS_LIMIT_UNITS: Partial<Record<keyof typeof PLUS_LIMITS, 'days'>> = {
  historyDays: 'days'
};
