import * as z from 'zod';

import { countSchema } from '../primitives/primitives.schemas';
import { LIST_SEPARATOR, PAGINATION } from './query.constants';

export const listParam = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(LIST_SEPARATOR)
            .map((part) => part.trim())
            .filter(Boolean)
        : value,
    z.array(item)
  );

export const booleanParam = z.preprocess((value) => {
  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return value;
}, z.boolean());

export const sortOrderSchema = z.enum(['asc', 'desc']);

export const sortQuery = <T extends z.ZodEnum>(field: T) =>
  z.object({
    sort: field.optional(),
    order: sortOrderSchema.default('desc')
  });

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
  offset: z.coerce.number().int().min(0).max(PAGINATION.maxOffset).default(0)
});

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: countSchema,
    limit: z.number().int().positive(),
    offset: countSchema
  });
