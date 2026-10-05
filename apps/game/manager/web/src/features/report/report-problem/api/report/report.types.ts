import type { z } from 'zod';

import type { DialogText } from '@/shared/api';

import type { reportPartSchema } from './report.schemas';

export type ReportPart = z.infer<typeof reportPartSchema>;

export type SendReportInput = {
  previewId: string;
  parts: ReportPart[];
  message: string;
};

export type SaveReportInput = SendReportInput & {
  text: DialogText;
};
