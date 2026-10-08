import { rem } from '@/shared/lib/css-unit';

import { HIT_VIEWER } from '../../config';

export const tableBodyHeight = (rows: number): string => rem(rows * HIT_VIEWER.table.rowHeight);

export const pickerListHeight = (rows: number): string => rem(Math.min(rows, HIT_VIEWER.picker.maxRows) * HIT_VIEWER.picker.rowHeight);
