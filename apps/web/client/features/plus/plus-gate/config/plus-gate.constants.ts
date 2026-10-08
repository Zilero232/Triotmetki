import type { LucideIcon } from 'lucide-react';

import { Box, ChartLine, Crosshair, FlaskConical, LockKeyhole, Map, Radio, Timer, TrendingUp } from 'lucide-react';

import type { PlusTeaserFeature } from './plus-gate.types';

export const PLUS_FEATURE_ICONS = {
  analytics: ChartLine,
  mapAdvisor: Map,
  battleAnalysis: Crosshair,
  priorityPolling: Timer,
  progression: TrendingUp,
  privateCompetitions: LockKeyhole,
  streamerAlerts: Radio,
  supertest: FlaskConical,
  armor3d: Box
} as const satisfies Record<PlusTeaserFeature, LucideIcon>;

export const PLUS_GATE = {
  iconSize: 18,
  skeletonHeight: 160,
  checkoutHash: '#checkout'
} as const;

export const PLUS_FEATURE_PREVIEW = {
  analytics: 'chart',
  mapAdvisor: 'table',
  battleAnalysis: 'chart',
  priorityPolling: 'cards',
  progression: 'table',
  privateCompetitions: 'table',
  streamerAlerts: 'cards',
  supertest: 'table',
  armor3d: 'cards'
} as const satisfies Record<PlusTeaserFeature, 'cards' | 'chart' | 'table'>;

export const PLUS_PREVIEW_SAMPLE = {
  chart: '0,70 12,62 24,66 36,48 48,54 60,36 72,40 84,24 96,30 108,14 120,20',
  rows: [92, 74, 61, 48],
  cards: [0, 1, 2]
} as const;
