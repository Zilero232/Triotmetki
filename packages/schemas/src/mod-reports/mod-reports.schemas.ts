import * as z from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { MOD_REPORTS } from './mod-reports.constants';

export const modProblemReportFileSchema = z.strictObject({
  name: z.string().regex(MOD_REPORTS.fileNamePattern),
  text: z.string().max(MOD_REPORTS.maxFileTextBytes)
});

export const modProblemReportRequestSchema = z
  .strictObject({
    manager_version: z.string().min(1).max(MOD_REPORTS.managerVersionMaxLength),
    modpack_version: z.string().max(MOD_REPORTS.modpackVersionMaxLength).nullable(),
    game_version: z.string().max(MOD_REPORTS.gameVersionMaxLength).nullable(),
    message: z.string().max(MOD_REPORTS.messageMaxLength),
    files: z.array(modProblemReportFileSchema).min(MOD_REPORTS.minFiles).max(MOD_REPORTS.maxFiles)
  })
  .describe('A problem report from the modpack manager: its versions, what the user wrote and the log files it attached');

export const modProblemReportReceiptSchema = z.object({
  id: uuidSchema,
  expires_at: isoDateTimeSchema
});
