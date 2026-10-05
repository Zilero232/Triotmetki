import { notFound } from 'next/navigation';

import type { RouteEntity, RouteMeta } from '../route-meta';

export const requireRouteEntity = async (entity: Promise<RouteEntity>): Promise<RouteEntity> => {
  const found = await entity;

  if (!found.isFound) {
    notFound();
  }

  return found;
};

export const requireRouteMeta = async <T>(lookup: Promise<RouteMeta<T>>): Promise<T | null> => {
  const { meta, isFound } = await lookup;

  if (!isFound) {
    notFound();
  }

  return meta;
};
