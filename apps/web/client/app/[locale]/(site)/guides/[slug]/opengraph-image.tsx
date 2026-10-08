import { guideOgSource } from '@/entities/guide/guide/server';
import { SITE } from '@/shared/config/site';
import { resolveLocale } from '@/shared/i18n';
import { decodeRouteParam } from '@/shared/lib/route-param';
import { OG_SIZE } from '@/shared/seo/og';
import { EntityOgCard, guideOgCard } from '@/views/entity-og';
import { ogImage } from '@/views/player-og/server';

export const size = OG_SIZE;

export const contentType = 'image/png';

export const alt = SITE.name;

const Image = async ({ params }: PageProps<'/[locale]/guides/[slug]'>) => {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);

  return ogImage({
    locale,
    card: async ({ host }) => <EntityOgCard {...guideOgCard({ guide: await guideOgSource(decodeRouteParam(slug)), locale, host })} />
  });
};

export default Image;
