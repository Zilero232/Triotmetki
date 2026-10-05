import { Logger, Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { Redis } from 'ioredis';

import type { LestaClient } from '../../lib/lesta';

import { AppConfigService } from '../../config';
import { LESTA_CLIENT, PrismaService, REDIS } from '../../core';
import { createAuth } from '../../lib/auth';
import { AuthStoresModule } from './auth-stores.module';
import { AUTH_MODULE } from './config/auth-module.constants';
import { authEnv } from './lib/auth-env/auth-env';
import { AccountPurgeWriterService } from './services/account-purge-writer.service';
import { LestaAccountsWriterService } from './services/lesta-accounts-writer.service';
import { TelegramAccountsWriterService } from './services/telegram-accounts-writer.service';

@Module({
  imports: [
    AuthStoresModule,
    BetterAuthModule.forRootAsync({
      isGlobal: true,
      imports: [AuthStoresModule],
      inject: [
        AppConfigService,
        PrismaService,
        REDIS,
        LESTA_CLIENT,
        LestaAccountsWriterService,
        TelegramAccountsWriterService,
        AccountPurgeWriterService
      ],
      useFactory: (
        config: AppConfigService,
        prisma: PrismaService,
        redis: Redis,
        lesta: LestaClient,
        lestaStore: LestaAccountsWriterService,
        telegramStore: TelegramAccountsWriterService,
        accountPurge: AccountPurgeWriterService
      ) => ({
        auth: createAuth({
          env: authEnv(config),
          prisma,
          redis,
          lesta,
          lestaStore,
          telegramStore,
          accountPurge,
          logger: new Logger(AUTH_MODULE.logContext)
        }),
        disableTrustedOriginsCors: true,
        bodyParser: { rawBody: true, json: { limit: AUTH_MODULE.jsonLimit } }
      })
    })
  ],
  exports: [AuthStoresModule]
})
export class AuthModule {}
