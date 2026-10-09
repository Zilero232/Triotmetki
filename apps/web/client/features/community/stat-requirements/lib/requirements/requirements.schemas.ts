import * as z from 'zod';

import type { OptionalNumberRule } from './requirements.types';

import { REQUIREMENTS_FORM } from '../../config';

const isAllowedNumber = ({ value, max, isInteger }: OptionalNumberRule & { value: string }): boolean => {
  if (value === '') {
    return true;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 && (max === undefined || parsed <= max) && (!isInteger || Number.isInteger(parsed));
};

const optionalNumber = (rule: OptionalNumberRule) =>
  z
    .string()
    .trim()
    .refine((value) => isAllowedNumber({ ...rule, value }));

export const requirementsFormSchema = z.object({
  minBattles: optionalNumber({ isInteger: true }),
  minWn8: optionalNumber({}),
  maxWn8: optionalNumber({}),
  minWinRate: optionalNumber({ max: REQUIREMENTS_FORM.maxWinRatePercent })
});
