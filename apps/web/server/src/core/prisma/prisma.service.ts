import type { Database } from './kysely';

import { PrismaClient } from '../../../generated';

export abstract class PrismaService extends PrismaClient {
  declare readonly $kysely: Database;
}
