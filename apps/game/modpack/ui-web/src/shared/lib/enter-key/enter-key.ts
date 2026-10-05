import { KEYS } from '@/shared/config';

export const onEnterKey =
  (action: () => void) =>
  (key: string): void => {
    if (key === KEYS.enter) {
      action();
    }
  };
