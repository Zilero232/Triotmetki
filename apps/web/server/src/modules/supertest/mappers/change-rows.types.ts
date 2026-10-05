import type { LiveValueInput } from '../lib/live-value/live-value.types';
import type { ParsedTank } from '../lib/supertest-article/supertest-article.types';

export type ToChangeRowsInput = {
  tank: ParsedTank;
  stats: LiveValueInput['stats'];
};
