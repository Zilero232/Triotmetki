import { useId } from 'react';

import type { FormControlA11y, UseFormFieldInput } from './use-form-field.types';

export const useFormField = ({ htmlFor, hasHint, hasError }: UseFormFieldInput) => {
  const baseId = useId();

  const controlId = htmlFor ?? `${baseId}-control`;
  const labelId = `${baseId}-label`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const describedIds = [hasError ? errorId : null, hasHint ? hintId : null].filter((value) => value !== null);
  const describedBy = describedIds.length > 0 ? describedIds.join(' ') : undefined;
  const control: FormControlA11y = {
    ...(htmlFor ? {} : { id: controlId }),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(hasError ? { 'aria-invalid': true } : {})
  };

  return { controlId, labelId, hintId, errorId, control };
};
