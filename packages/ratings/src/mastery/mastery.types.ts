import type { MASTERY_BADGES, MASTERY_LEVELS } from './mastery.constants';

export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export type MasteryBadge = (typeof MASTERY_BADGES)[number];

export type MasteryThresholds = Record<MasteryBadge, number>;
