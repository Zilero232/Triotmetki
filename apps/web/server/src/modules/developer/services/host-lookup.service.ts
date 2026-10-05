import { Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';

import type { HostLookup } from '../lib/webhook-url/webhook-url.types';

@Injectable()
export class HostLookupService {
  readonly resolve: HostLookup = async (host) => lookup(host, { all: true });
}
