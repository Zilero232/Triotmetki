import type { Transporter } from 'nodemailer';

import { Injectable } from '@nestjs/common';
import { render } from 'react-email';

import type { NotificationEmailInput } from '../notifications.types';

import { AppConfigService } from '../../../config';
import { isPlaceholderEmail } from '../../../lib/auth';
import { SMTP_TIMEOUTS } from '../config/email.constants';
import { notificationText } from '../lib/notification-copy/notification-copy';
import { DigestEmail } from '../templates/digest-email';
import { MailTransportService } from './mail-transport.service';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: AppConfigService, transport: MailTransportService) {
    const host = config.get('SMTP_HOST');

    this.from = config.get('EMAIL_FROM');

    this.transporter =
      host && this.from
        ? transport.create({
            host,
            port: config.get('SMTP_PORT'),
            secure: config.get('SMTP_SECURE'),
            auth: config.get('SMTP_USER') ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASSWORD') } : undefined,
            ...SMTP_TIMEOUTS
          })
        : null;
  }

  get isEnabled(): boolean {
    return this.transporter !== null;
  }

  canReach(email: string | null | undefined): boolean {
    return this.isEnabled && Boolean(email) && !isPlaceholderEmail(email ?? '');
  }

  async sendNotification({ to, locale, rendered }: NotificationEmailInput): Promise<void> {
    if (!this.transporter) {
      return;
    }

    const email = DigestEmail({
      locale,
      title: rendered.title,
      body: rendered.body,
      url: rendered.url,
      cta: notificationText({ locale, key: 'open' })
    });

    const [html, text] = await Promise.all([render(email), render(email, { plainText: true })]);

    await this.transporter.sendMail({ from: this.from, to, subject: rendered.title, html, text });
  }
}
