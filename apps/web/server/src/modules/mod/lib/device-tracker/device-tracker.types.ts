import type { IncomingHttpHeaders } from 'node:http';

export type TrackedRequest = {
  ip?: string;
  headers?: IncomingHttpHeaders;
};
