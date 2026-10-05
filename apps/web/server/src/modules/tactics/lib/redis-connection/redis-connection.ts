import type { RedisConnection } from './redis-connection.types';

import { REDIS_CONNECTION } from '../../config/tactics.constants';

export const redisConnection = (url: string): RedisConnection => {
  const parsed = new URL(url);
  const db = Number(parsed.pathname.slice(1));

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : REDIS_CONNECTION.defaultPort,
    options: {
      ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      ...(Number.isInteger(db) && db > 0 ? { db } : {}),
      ...(parsed.protocol === REDIS_CONNECTION.tlsProtocol ? { tls: {} } : {})
    }
  };
};
