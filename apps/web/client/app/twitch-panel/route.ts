import { getTranslations } from 'next-intl/server';
import { fromKeys } from 'remeda';

import { env } from '@/shared/config';
import { resolveLocale } from '@/shared/i18n';
import { panelHtml, TWITCH_PANEL } from '@/views/twitch-panel';

export const GET = async (request: Request): Promise<Response> => {
  const locale = resolveLocale(new URL(request.url).searchParams.get('language') ?? undefined);
  const t = await getTranslations({ locale, namespace: 'streamer.twitchPanel' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const panelCopy = fromKeys(TWITCH_PANEL.copyKeys, (key) => t(key));
  const copy = { ...panelCopy, attribution: tFooter('shortAttribution') };

  return new Response(panelHtml({ apiUrl: env.NEXT_PUBLIC_API_URL, locale, copy }), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' }
  });
};
