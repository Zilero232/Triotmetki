import type { Prisma } from '../../../../../generated';

export type PrismaRequestError = Prisma.PrismaClientKnownRequestError;

export type UniqueViolationOnInput = {
  error: unknown;
  constraint: string;
};
