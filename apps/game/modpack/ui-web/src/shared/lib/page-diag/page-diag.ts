import { send } from '@/shared/api/protocol';

import type { ReportOnceInput } from './page-diag.types';

import { PAGE_DIAG } from './page-diag.constants';

const reported = new Set<string>();

export const reportOnce = ({ kind, text }: ReportOnceInput): boolean => {
  if (reported.has(kind)) {
    return false;
  }

  reported.add(kind);

  return send({ type: 'diag', text: `${kind}: ${text}`.slice(0, PAGE_DIAG.maxChars) });
};

export const forgetReports = (): void => reported.clear();
