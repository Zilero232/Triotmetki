import { Module } from '@nestjs/common';

import { HttpModule } from '../../../core';
import { NewsProcessor } from './processors/news.processor';
import { NewsSyncService } from './services/news-sync.service';

@Module({
  imports: [HttpModule],
  providers: [NewsSyncService, NewsProcessor]
})
export class NewsModule {}
