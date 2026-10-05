import { clanActivity } from '../queries/clan-activity.queries';

export const CLANS_QUERIES = Symbol('CLANS_QUERIES');

export const clansQueries = { clanActivity };

export const clansQueriesProvider = { provide: CLANS_QUERIES, useValue: clansQueries };
