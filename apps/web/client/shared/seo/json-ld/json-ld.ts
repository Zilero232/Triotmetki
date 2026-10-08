import type { BlogPosting, BreadcrumbList, Graph, ItemList, OrganizationLeaf, ProfilePage, SportsTeam, WithContext } from 'schema-dts';

import { isNonNullish } from 'remeda';

import type { Locale, LocalePathInput } from '@/shared/i18n';

import { SITE, SUPPORT } from '@/shared/config/site';
import { ROUTES } from '@/shared/constants';
import { localePath } from '@/shared/i18n';

import type { ArticleJsonLdInput, BreadcrumbJsonLdInput, EntityJsonLdInput, ItemListJsonLdInput, JsonLdData } from './json-ld.types';

import { absoluteUrl } from '../site-metadata';
import { JSON_LD } from './json-ld.constants';

const localeUrl = (input: LocalePathInput) => absoluteUrl(localePath(input));

export const jsonLdText = (data: JsonLdData) => JSON.stringify(data).replaceAll('<', JSON_LD.escapedLt);

export const organizationJsonLd = (): OrganizationLeaf => ({
  '@type': 'Organization',
  '@id': `${SITE.url}${JSON_LD.organizationId}`,
  name: SITE.name,
  url: SITE.url,
  logo: absoluteUrl(JSON_LD.logo),
  sameAs: [SUPPORT.telegramUrl]
});

export const siteJsonLd = (locale: Locale): Graph => ({
  '@context': JSON_LD.context,
  '@graph': [
    organizationJsonLd(),
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}${JSON_LD.websiteId}`,
      name: SITE.name,
      url: localeUrl({ path: ROUTES.home, locale }),
      inLanguage: locale,
      publisher: { '@id': `${SITE.url}${JSON_LD.organizationId}` }
    }
  ]
});

export const breadcrumbJsonLd = ({ items, locale }: BreadcrumbJsonLdInput): WithContext<BreadcrumbList> => ({
  '@context': JSON_LD.context,
  '@type': 'BreadcrumbList',
  itemListElement: items.map(({ name, path }, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    ...(isNonNullish(path) ? { item: localeUrl({ path, locale }) } : {})
  }))
});

export const personJsonLd = ({ name, path, locale, image }: EntityJsonLdInput): WithContext<ProfilePage> => ({
  '@context': JSON_LD.context,
  '@type': 'ProfilePage',
  url: localeUrl({ path, locale }),
  mainEntity: { '@type': 'Person', name, url: localeUrl({ path, locale }), ...(image ? { image } : {}) }
});

export const clanJsonLd = ({ name, path, locale, image }: EntityJsonLdInput): WithContext<SportsTeam> => ({
  '@context': JSON_LD.context,
  '@type': 'SportsTeam',
  name,
  url: localeUrl({ path, locale }),
  ...(image ? { logo: image } : {})
});

export const itemListJsonLd = ({ name, path, items, locale }: ItemListJsonLdInput): WithContext<ItemList> => ({
  '@context': JSON_LD.context,
  '@type': 'ItemList',
  name,
  url: localeUrl({ path, locale }),
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: localeUrl({ path: item.path, locale })
  }))
});

export const articleJsonLd = ({
  headline,
  description,
  path,
  locale,
  image,
  datePublished,
  dateModified,
  authorName
}: ArticleJsonLdInput): WithContext<BlogPosting> => ({
  '@context': JSON_LD.context,
  '@type': 'BlogPosting',
  headline,
  description,
  url: localeUrl({ path, locale }),
  mainEntityOfPage: { '@type': 'WebPage', '@id': localeUrl({ path, locale }) },
  inLanguage: locale,
  dateModified,
  ...(datePublished ? { datePublished } : {}),
  ...(image ? { image: [image] } : {}),
  author: authorName ? { '@type': 'Person', name: authorName } : { '@id': `${SITE.url}${JSON_LD.organizationId}` },
  publisher: organizationJsonLd()
});
