import type { ContentReport } from '../../../../generated';
import type { ContentReportView } from '../moderation.types';

import { toIso } from '../../../common/lib';

export const toReportView = (report: ContentReport): ContentReportView => ({
  id: report.id,
  targetType: report.targetType,
  targetId: report.targetId,
  reason: report.reason,
  details: report.details,
  status: report.status,
  reporterUserId: report.reporterUserId,
  createdAt: report.createdAt.toISOString(),
  resolvedAt: toIso(report.resolvedAt)
});
