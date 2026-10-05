import { useState } from 'react';

import { send } from '@/shared/api/protocol';
import { onEnterKey } from '@/shared/lib/enter-key';

export const useBindForm = () => {
  const [code, setCode] = useState('');

  const bind = (): void => {
    const trimmed = code.trim();

    if (!trimmed) {
      return;
    }

    send({ type: 'bind', code: trimmed });
    setCode('');
  };

  return {
    code,
    canBind: code.trim().length > 0,
    bind,
    setCode,
    onKey: onEnterKey(bind)
  };
};
