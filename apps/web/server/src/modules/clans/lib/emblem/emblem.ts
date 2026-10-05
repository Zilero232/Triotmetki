import { isObjectType, isString } from 'remeda';

import { EMBLEM_PATHS } from './emblem.constants';

export const clanEmblem = (emblems: unknown): string | null => {
  if (!isObjectType(emblems)) {
    return null;
  }

  for (const [size, kind] of EMBLEM_PATHS) {
    const group: unknown = Reflect.get(emblems, size);
    const url: unknown = isObjectType(group) ? Reflect.get(group, kind) : null;

    if (isString(url) && URL.canParse(url)) {
      return url;
    }
  }

  return null;
};
