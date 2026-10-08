import { NextIntlClientProvider } from 'next-intl';
import * as rootParams from 'next/root-params';

import { FORMATS, resolveLocale, TIME_ZONE } from '@/shared/i18n';

import type { WithMessagesInput } from './with-messages.types';

import { MutationFeedbackSync } from '../../providers/components';
import { scopedMessages } from '../root-messages';

export const withMessages = <P extends object>({ component: Component, messages }: WithMessagesInput<P>) => {
  const WithMessages = async (props: P) => {
    const locale = resolveLocale(await rootParams.locale());

    return (
      <NextIntlClientProvider formats={FORMATS} locale={locale} messages={scopedMessages({ locale, paths: messages })} timeZone={TIME_ZONE}>
        <Component {...props} />
        <MutationFeedbackSync scope='page' />
      </NextIntlClientProvider>
    );
  };

  return WithMessages;
};
