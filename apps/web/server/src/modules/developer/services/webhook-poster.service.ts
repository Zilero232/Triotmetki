import { Injectable } from '@nestjs/common';

import { postWebhook } from '../lib/webhook-post/webhook-post';

@Injectable()
export class WebhookPosterService {
  readonly post = postWebhook;
}
