import { send } from '@/shared/api/protocol';

import { ACCOUNT } from '../../config';

export const openSite = (): void => {
  send({ type: 'open', path: ACCOUNT.sitePath });
};

export const openCodePage = (): void => {
  send({ type: 'open', path: ACCOUNT.codePath });
};
