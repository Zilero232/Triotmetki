import type { Language } from '@/shared/i18n';

import { send } from '@/shared/api/protocol';

export const selectLanguage = (language: Language): void => {
  send({ type: 'language', language });
};
