import type { CompiledQuery } from 'kysely';

export type MockPrismaServiceInput = {
  queries?: CompiledQuery[];
};
