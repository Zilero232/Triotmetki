import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../../core';

export const createPrisma = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockResolvedValue([]);

  return prisma;
};

export const queryValues = (prisma: ReturnType<typeof createPrisma>, call = 0): unknown[] => prisma.$queryRaw.mock.calls[call]?.slice(1) ?? [];

export const queryText = (prisma: ReturnType<typeof createPrisma>, call = 0): string => {
  const [strings] = prisma.$queryRaw.mock.calls[call] ?? [];

  return Array.isArray(strings) ? strings.join('?') : '';
};
