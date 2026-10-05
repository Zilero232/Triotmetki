import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { validateEnv } from '../env/env';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [NestConfigModule.forRoot({ isGlobal: true, cache: true, ignoreEnvFile: true, validate: validateEnv })],
  providers: [AppConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule {}
