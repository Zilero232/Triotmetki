import * as z from 'zod/mini';

import { hudIconSchema } from '@/shared/api/hud-protocol';

export const battleClockSchema = z.object({ time: z.string(), timer: z.string(), icon: hudIconSchema });
