'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { returnUrl } from '@/entities/auth/session';
import { QUERY_KEYS, ROUTES } from '@/shared/constants';
import { resolveLocale } from '@/shared/i18n';

import type { BotProvider } from '../../../api';

import { getBotLinks, linkBotAccount, unlinkBotAccount } from '../../../api';
import { botRows } from '../../../lib/bot-rows';
import { useMeSection } from '../use-me-section';

export const useBotsCard = () => {
  const locale = resolveLocale(useLocale());
  const query = useMeSection({ section: 'bots', fetcher: getBotLinks });
  const unlink = useMutation({
    mutationFn: unlinkBotAccount,
    meta: { successKey: 'me.toast.botUnlinked', errorKey: 'me.toast.failed', invalidates: [QUERY_KEYS.me.section('bots')] }
  });

  const link = useMutation({
    mutationFn: linkBotAccount,
    onSuccess: (url) => {
      if (url) {
        window.location.assign(url);
      }
    },
    meta: { errorKey: 'me.toast.failed' }
  });

  const { data, isFetching, refetch } = query;

  const onLink = (provider: BotProvider) => {
    const callbackURL = returnUrl({ path: ROUTES.account.overview, locale, origin: window.location.origin });

    link.mutate({ provider, callbackURL });
  };

  return {
    query,
    rows: data ? botRows(data) : [],
    isRetrying: isFetching,
    isBusy: link.isPending || unlink.isPending,
    onRetry: () => void refetch(),
    onLink,
    onUnlink: unlink.mutate
  };
};
