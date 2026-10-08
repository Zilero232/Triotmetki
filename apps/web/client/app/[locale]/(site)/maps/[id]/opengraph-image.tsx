import { mapOgSource } from '@/entities/map/map/server';
import { SITE } from '@/shared/config/site';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { OG_SIZE } from '@/shared/seo/og';
import { EntityOgCard, mapOgCard } from '@/views/entity-og';
import { ogImage } from '@/views/player-og/server';

export const size = OG_SIZE;

export const contentType = 'image/png';

export const alt = SITE.name;

const Image = async ({ params }: PageProps<'/[locale]/maps/[id]'>) => {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);

  return ogImage({
    locale,
    card: async ({ host }) => <EntityOgCard {...mapOgCard({ map: await mapOgSource(decodeRouteParam(id)), locale, host })} />
  });
};

export default Image;
