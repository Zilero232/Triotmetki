import { RECENT_PERIODS } from '@otmetki/ratings';
import * as z from 'zod';

export const recentPeriodSchema = z.enum(RECENT_PERIODS);

export const ratingPeriodSchema = z.enum(['overall', ...recentPeriodSchema.options]);

export const serverPeriodSchema = z.enum(['1d', '7d', '14d', '30d', '60d']);

export const statsModeSchema = z.enum(['all', 'random', 'ranked', 'epic', 'clan', 'stronghold']);

export const skillCohortSchema = z.enum(['all', 'beginner', 'average', 'good', 'elite']);
