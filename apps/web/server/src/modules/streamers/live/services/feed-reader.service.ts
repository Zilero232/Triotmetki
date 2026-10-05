import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

@Injectable()
export class FeedReaderService {
  private readonly parser = new Parser();

  async read(url: string): ReturnType<Parser['parseURL']> {
    return this.parser.parseURL(url);
  }
}
