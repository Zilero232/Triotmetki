import type { z } from 'zod';

import type { DialogText } from '@/shared/api';

import type { reportPartSchema, reportPreviewSchema } from './report.schemas';

export type ReportPart = z.infer<typeof reportPartSchema>;

export type ReportItem = z.infer<typeof reportPreviewSchema>['items'][number];

export type SendReportInput = {
  previewId: string;
  parts: ReportPart[];
  message: string;
};

export type SaveReportInput = SendReportInput & {
  text: DialogText;
};
