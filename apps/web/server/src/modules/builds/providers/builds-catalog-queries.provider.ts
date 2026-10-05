import { BUILDS_QUERY_TOKENS } from '../config/queries.constants';
import { BUILDS_CATALOG_QUERIES } from '../queries/builds-catalog.queries';

export const buildsCatalogQueriesProvider = {
  provide: BUILDS_QUERY_TOKENS.catalog,
  useValue: BUILDS_CATALOG_QUERIES
};
