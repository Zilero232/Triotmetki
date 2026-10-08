import type { ClanPage, Guide, MapDetail, TankDetail } from '@/shared/api/generated';
import type { Locale } from '@/shared/i18n';
import type { OgMetric } from '@/shared/seo/og';

type EntityOgKind = 'armor' | 'build' | 'tank';

type EntityOgInput = {
  locale: Locale;
  host: string;
};

export type TankOgCardInput = EntityOgInput & {
  tank: Pick<TankDetail, 'serverStats' | 'vehicle'>;
  kind: EntityOgKind;
};

export type SiteOgCardInput = EntityOgInput;

export type ClanOgCardInput = EntityOgInput & {
  page: Pick<ClanPage, 'clan' | 'stats'>;
};

export type MapOgCardInput = EntityOgInput & {
  map: Pick<MapDetail, 'maxPlayersInTeam' | 'name' | 'nameEn' | 'sizeMeters' | 'slug' | 'stats'>;
};

export type GuideOgCardInput = EntityOgInput & {
  guide: Pick<Guide, 'author' | 'kind' | 'likesCount' | 'slug' | 'title'>;
};

export type DashInput = {
  value: number | null;
  render: (known: number) => string;
};

export type EntityOgCardData = {
  heading: string;
  title: string;
  subtitle: string;
  metrics: OgMetric[];
  url: string;
  source: string;
};
