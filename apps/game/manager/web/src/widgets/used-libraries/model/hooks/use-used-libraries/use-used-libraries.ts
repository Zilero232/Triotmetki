import { useLocale } from 'use-intl';

import { useCatalog } from '@/entities/catalog';
import { pickLocalized } from '@/shared/lib';

export const useUsedLibraries = () => {
  const locale = useLocale();
  const { data: catalog } = useCatalog();

  return (catalog?.dependencies ?? []).map((dependency) => ({
    id: dependency.id,
    title: pickLocalized({ text: dependency.title, locale }),
    version: dependency.version,
    licence: dependency.licence.name,
    licenceUrl: dependency.licence.url,
    author: dependency.author.name,
    authorUrl: dependency.author.url
  }));
};
