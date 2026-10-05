import type { z } from 'zod';

import type {
  masteryThresholdSchema,
  moeCurvePointSchema,
  moeCurveSchema,
  moeHistoryBatchQuerySchema,
  moeHistoryBatchSchema,
  moeHistoryPointSchema,
  moeHistoryQuerySchema,
  moeHistorySchema,
  moePageSchema,
  moeProjectionSchema,
  moeQuerySchema,
  moeRowSchema,
  moeSortFieldSchema,
  moeThresholdSchema,
  sweatIndexSchema,
  sweatLevelSchema
} from './marks.schemas';

export type MoeThreshold = z.infer<typeof moeThresholdSchema>;
export type MasteryThreshold = z.infer<typeof masteryThresholdSchema>;
export type MoeRow = z.infer<typeof moeRowSchema>;
export type MoeSortField = z.infer<typeof moeSortFieldSchema>;
export type MoeQuery = z.infer<typeof moeQuerySchema>;
export type MoePage = z.infer<typeof moePageSchema>;
export type MoeHistory = z.infer<typeof moeHistorySchema>;
export type MoeHistoryQuery = z.infer<typeof moeHistoryQuerySchema>;
export type MoeHistoryBatchQuery = z.infer<typeof moeHistoryBatchQuerySchema>;
export type MoeHistoryPoint = z.infer<typeof moeHistoryPointSchema>;
export type MoeHistoryBatch = z.infer<typeof moeHistoryBatchSchema>;
export type MoeProjection = z.infer<typeof moeProjectionSchema>;
export type SweatLevel = z.infer<typeof sweatLevelSchema>;
export type SweatIndex = z.infer<typeof sweatIndexSchema>;
export type MoeCurve = z.infer<typeof moeCurveSchema>;
export type MoeCurvePoint = z.infer<typeof moeCurvePointSchema>;
