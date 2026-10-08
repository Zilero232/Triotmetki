import { useState } from 'react';

export const useLastPresent = <Value>(value: Value | null): Value | null => {
  const [last, setLast] = useState<Value | null>(value);

  if (value !== null && value !== last) {
    setLast(value);
  }

  return value ?? last;
};
