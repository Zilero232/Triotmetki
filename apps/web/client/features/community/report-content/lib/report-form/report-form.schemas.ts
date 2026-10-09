import * as z from 'zod';

import { zCreateReport } from '../../api';

export const reportFormSchema = z.object({
  reason: zCreateReport.shape.reason,
  details: z.string().trim().pipe(zCreateReport.shape.details.unwrap())
});
