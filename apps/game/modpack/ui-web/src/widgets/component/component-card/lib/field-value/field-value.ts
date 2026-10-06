import type { FieldValueInput } from './field-value.types';

export const fieldValue = ({ fields, key }: FieldValueInput): string | null => {
  const field = fields.find((item) => item.key === key);

  return field ? String(field.value) : null;
};
