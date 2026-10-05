import { META_TOKENS } from '../config/tokens.constants';
import { buildRanks } from '../queries/build-usage.queries';
import { modeMetaRows } from '../queries/mode-meta.queries';

export const metaQueries = { modeMetaRows, buildRanks };

export const metaQueriesProvider = {
  provide: META_TOKENS.queries,
  useValue: metaQueries
};
