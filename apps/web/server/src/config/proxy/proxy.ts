import type { Env } from '../env/env.types';

import { envList } from '../env-list/env-list';
import { PROXY } from './proxy.constants';

export const trustedProxies = (env: Pick<Env, 'TRUSTED_PROXIES'>): string[] => envList(env.TRUSTED_PROXIES);

export const expressTrustProxy = (env: Pick<Env, 'TRUSTED_PROXIES'>): number | string[] => {
  const proxies = trustedProxies(env);

  return proxies.length > 0 ? proxies : PROXY.defaultHops;
};
