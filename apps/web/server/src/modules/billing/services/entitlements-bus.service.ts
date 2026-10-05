import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';
import { Subject } from 'rxjs';

import type { EntitlementChange, EntitlementMessageInput } from '../billing.types';

import { errorMessage } from '../../../common/lib';
import { REDIS } from '../../../core';
import { ENTITLEMENTS } from '../config/entitlements.constants';

@Injectable()
export class EntitlementsBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EntitlementsBusService.name);
  private readonly instanceId = nanoid();
  private readonly subject = new Subject<EntitlementChange>();
  private subscriber: Redis | null = null;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  get changes$(): Observable<EntitlementChange> {
    return this.subject.asObservable();
  }

  async onModuleInit(): Promise<void> {
    this.subscriber = this.redis.duplicate();

    this.subscriber.on('message', (channel: string, message: string) => {
      this.receive({ channel, message });
    });

    await this.subscriber.subscribe(ENTITLEMENTS.channel).catch((error: unknown) => {
      this.logger.warn(`entitlements channel not subscribed: ${errorMessage(error)}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.subject.complete();
    await this.subscriber?.quit().catch(() => undefined);
  }

  publish(userId: string): void {
    this.subject.next({ userId, isLocal: true });

    void this.redis.publish(ENTITLEMENTS.channel, `${this.instanceId}${ENTITLEMENTS.separator}${userId}`).catch((error: unknown) => {
      this.logger.warn(`entitlements change for ${userId} not broadcast: ${errorMessage(error)}`);
    });
  }

  private receive({ channel, message }: EntitlementMessageInput): void {
    const [origin, userId] = message.split(ENTITLEMENTS.separator);

    if (channel !== ENTITLEMENTS.channel || !userId || origin === this.instanceId) {
      return;
    }

    this.subject.next({ userId, isLocal: false });
  }
}
