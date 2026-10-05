import type { z } from 'zod';

import type { healthReportSchema } from './dto/health.schemas';

export type HealthReport = z.infer<typeof healthReportSchema>;
