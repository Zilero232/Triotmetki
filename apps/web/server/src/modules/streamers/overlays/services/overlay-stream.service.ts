import type { MessageEvent, OnModuleDestroy } from '@nestjs/common';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { defer, from, interval, map, merge, Observable, startWith, switchMap } from 'rxjs';

import { errorMessage } from '../../../../common/lib';
import { REDIS } from '../../../../core';
import { OVERLAY } from '../config/overlay.constants';
import { OverlayDataService } from './overlay-data.service';
import { OverlayPublisherService } from './overlay-publisher.service';

@Injectable()
export class OverlayStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(OverlayStreamService.name);
  private subscriber: Redis | null = null;
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly data: OverlayDataService,
    private readonly publisher: OverlayPublisherService
  ) {}

  stream(publicKey: string): Observable<MessageEvent> {
    return defer(() => from(this.data.find(publicKey))).pipe(
      switchMap((overlay) =>
        from(this.data.accountOf(overlay)).pipe(
          switchMap((accountId) =>
            merge(
              accountId === null ? new Observable<void>() : this.changes(this.publisher.channelOf(accountId)),
              interval(OVERLAY.streamRefreshMs)
            ).pipe(
              startWith(0),
              switchMap(() => from(this.data.compute(overlay))),
              map((payload) => ({ data: payload }))
            )
          )
        )
      )
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit().catch(() => undefined);
  }

  private changes(channel: string): Observable<void> {
    return new Observable<void>((observer) => {
      const notify = () => observer.next();
      const listeners = this.listeners.get(channel) ?? new Set<() => void>();

      listeners.add(notify);
      this.listeners.set(channel, listeners);

      if (listeners.size === 1) {
        void this.connection()
          .subscribe(channel)
          .catch((error: unknown) => {
            this.logger.warn(`overlay channel ${channel} not subscribed: ${errorMessage(error)}`);
          });
      }

      return () => {
        listeners.delete(notify);

        if (listeners.size === 0) {
          this.listeners.delete(channel);

          void this.connection()
            .unsubscribe(channel)
            .catch(() => undefined);
        }
      };
    });
  }

  private connection(): Redis {
    if (!this.subscriber) {
      this.subscriber = this.redis.duplicate();

      this.subscriber.on('message', (channel: string) => {
        for (const notify of this.listeners.get(channel) ?? []) {
          notify();
        }
      });
    }

    return this.subscriber;
  }
}
