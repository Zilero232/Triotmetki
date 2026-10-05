import type { z } from 'zod';

import type { leagueTierSchema, leagueZoneSchema, weeklyChallengeMetricSchema } from './social.schemas';

export type LeagueTier = z.infer<typeof leagueTierSchema>;
export type LeagueZone = z.infer<typeof leagueZoneSchema>;
export type WeeklyChallengeMetric = z.infer<typeof weeklyChallengeMetricSchema>;
