import { useState } from 'react';

import { onEnterKey } from '@/shared/lib/enter-key';

export const useSubmitField = (submitText: (text: string) => void) => {
  const [value, setValue] = useState('');

  const submit = (): void => {
    const trimmed = value.trim();

    if (trimmed) {
      submitText(trimmed);
      setValue('');
    }
  };

  return { value, setValue, submit, onKey: onEnterKey(submit) };
};
