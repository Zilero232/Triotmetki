import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import kyselyExtension from 'prisma-extension-kysely';

import type { CreatePgPoolInput, CreatePrismaClientInput } from './prisma.types';

import { PrismaClient } from '../../../generated';
import { createKysely } from './kysely';
import { PRISMA_POOL } from './prisma.constants';
import { PrismaService } from './prisma.service';

const logger = new Logger('PgPool');

export const createPgPool = ({ url, pool }: CreatePgPoolInput): Pool => {
  const created = new Pool({ ...PRISMA_POOL, ...pool, connectionString: url });

  created.on('error', (error) => {
    logger.warn(`idle connection dropped: ${error.message}`);
  });

  return created;
};

export const createPrismaClient = ({ url, pool, log = ['error'] }: CreatePrismaClientInput): PrismaService => {
  const client = new PrismaClient({ adapter: new PrismaPg(createPgPool({ url, pool })), log });

  // eslint-disable-next-line ts/consistent-type-assertions -- $extends re-types every delegate and drops $on; at runtime it is the same client plus $kysely, which PrismaService declares
  return client.$extends(kyselyExtension({ kysely: createKysely })) as unknown as PrismaService;
};
