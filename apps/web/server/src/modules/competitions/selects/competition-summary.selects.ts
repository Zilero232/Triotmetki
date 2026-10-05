import type { Prisma } from '../../../../generated';

export const COMPETITION_SUMMARY_INCLUDE = {
  owner: { select: { name: true } },
  teams: { select: { id: true, name: true, score: true, battles: true }, orderBy: [{ score: 'desc' }, { battles: 'asc' }], take: 1 },
  _count: { select: { teams: true, entries: true } }
} as const satisfies Prisma.CompetitionInclude;
