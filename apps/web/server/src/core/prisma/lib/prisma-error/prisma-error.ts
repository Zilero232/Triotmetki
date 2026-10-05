import { z } from 'zod';

import type { PrismaRequestError, UniqueViolationOnInput } from './prisma-error.types';

import { Prisma } from '../../../../../generated';
import { PRISMA_CODE } from '../../prisma.constants';

export const isPrismaRequestError = (error: unknown): error is PrismaRequestError => error instanceof Prisma.PrismaClientKnownRequestError;

export const isTransactionConflict = (error: unknown): boolean => isPrismaRequestError(error) && error.code === PRISMA_CODE.transactionConflict;

export const isUniqueViolation = (error: unknown): boolean => isPrismaRequestError(error) && error.code === PRISMA_CODE.uniqueViolation;

const uniqueViolationMetaSchema = z.object({
  target: z.union([z.string(), z.array(z.string())]).optional(),
  driverAdapterError: z
    .object({
      cause: z.object({ constraint: z.object({ index: z.string().optional(), fields: z.array(z.string()).optional() }).optional() }).optional()
    })
    .optional()
});

const uniqueViolationTargets = (error: unknown): string[] => {
  if (!isPrismaRequestError(error) || error.code !== PRISMA_CODE.uniqueViolation) {
    return [];
  }

  const meta = uniqueViolationMetaSchema.safeParse(error.meta);

  if (!meta.success) {
    return [];
  }

  const constraint = meta.data.driverAdapterError?.cause?.constraint;

  return [meta.data.target ?? [], constraint?.index ?? [], constraint?.fields ?? []].flat();
};

export const isUniqueViolationOn = ({ error, constraint }: UniqueViolationOnInput): boolean => uniqueViolationTargets(error).includes(constraint);
