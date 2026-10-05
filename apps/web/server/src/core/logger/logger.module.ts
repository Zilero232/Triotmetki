import type { DynamicModule } from '@nestjs/common';

import { Module } from '@nestjs/common';
import { createLogger } from '@otmetki/logger';
import { LoggerModule } from 'nestjs-pino';

import { isQuietRequest, requestId, serializeRequest, serializeResponse } from './lib/request-log/request-log';
import { LOGGER } from './logger.constants';

@Module({})
export class AppLoggerModule {
  static forService(service: string): DynamicModule {
    return LoggerModule.forRoot({
      pinoHttp: {
        logger: createLogger({ service, pretty: LOGGER.pretty }),
        genReqId: (request, response) => requestId({ request, response }),
        autoLogging: { ignore: isQuietRequest },
        serializers: { req: serializeRequest, res: serializeResponse }
      }
    });
  }
}
