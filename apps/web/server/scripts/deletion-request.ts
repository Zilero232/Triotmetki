import { parseArgs } from 'node:util';
import { z } from 'zod';

import { createPrismaClient } from '../src/core/prisma';
import { PurgeGuardService } from '../src/modules/collector/purge';

const { values } = parseArgs({
  options: {
    account: { type: 'string', multiple: true, default: [] },
    reason: { type: 'string' },
    source: { type: 'string', default: 'lesta' }
  }
});

const args = z
  .object({
    account: z.array(z.coerce.bigint().positive()).min(1),
    reason: z.string().trim().min(1),
    source: z.enum(['lesta', 'user'])
  })
  .safeParse(values);

if (!args.success) {
  console.error('Usage: bun scripts/deletion-request.ts --account <id> [--account <id>…] --reason "<ticket or letter>" [--source lesta|user]');
  process.exit(1);
}

const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
const prisma = createPrismaClient({ url: env.DATABASE_URL });

try {
  await prisma.$transaction(async (tx) =>
    new PurgeGuardService(prisma).open({ db: tx, accountIds: args.data.account, source: args.data.source, reason: args.data.reason })
  );

  console.log(`✓ opened ${args.data.account.length} ${args.data.source} deletion request(s); the purge dispatch picks them up`);
} finally {
  await prisma.$disconnect();
}
