import { PLUS } from '@otmetki/schemas';

import { NOTIFICATION_TOKENS } from '../config/tokens.constants';

export const plusCheckoutProvider = {
  provide: NOTIFICATION_TOKENS.plusCheckoutEnabled,
  useValue: PLUS.checkoutEnabled
};
