import * as z from 'zod';

import { LEAGUE_METRICS, LEAGUE_SCOPES, LEAGUE_TIERS, LEAGUE_ZONES, WEEKLY_CHALLENGE_METRICS } from './social.constants';

export const leagueTierSchema = z.enum(LEAGUE_TIERS);

export const leagueZoneSchema = z.enum(LEAGUE_ZONES);

export const leagueScopeSchema = z.enum(LEAGUE_SCOPES);

export const leagueMetricSchema = z.enum(LEAGUE_METRICS);

export const weeklyChallengeMetricSchema = z.enum(WEEKLY_CHALLENGE_METRICS);
