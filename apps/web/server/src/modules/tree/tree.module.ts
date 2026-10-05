import { Module } from '@nestjs/common';

import { TechTreeReaderService } from './services/tech-tree-reader.service';
import { TreeController } from './tree.controller';

@Module({
  controllers: [TreeController],
  providers: [TechTreeReaderService]
})
export class TreeModule {}
