import { Module } from '@nestjs/common';

import { CommunityBuildsController } from './community-builds.controller';
import { BuildShareWriterService } from './services/build-share-writer.service';

@Module({
  controllers: [CommunityBuildsController],
  providers: [BuildShareWriterService]
})
export class CommunityBuildsModule {}
