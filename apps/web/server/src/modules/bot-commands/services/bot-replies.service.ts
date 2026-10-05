import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { match } from 'ts-pattern';

import type {
  BotLink,
  BotReply,
  BotReplyInput,
  CommandReplyInput,
  FailureInput,
  LocalizedLinkInput,
  PlayerTextInput,
  TranslateInput
} from '../bot-commands.types';

import { formatNumberOr, formatPercentOr } from '../../../common/lib';
import { AppConfigService, TIME } from '../../../config';
import { SITE_LINKS } from '../config/links.constants';
import { BOT_COMMAND_LOCALE_FILES } from '../config/locales.constants';
import { createFluentStore } from '../lib/fluent-store/fluent-store';
import { isPublicUrl, playerUrl, siteUrl, statCardUrl } from '../lib/site-url/site-url';
import { BotStatsReaderService } from './bot-stats-reader.service';

@Injectable()
export class BotRepliesService {
  private readonly i18n = createFluentStore({ files: BOT_COMMAND_LOCALE_FILES });

  constructor(
    private readonly config: AppConfigService,
    private readonly stats: BotStatsReaderService
  ) {}

  reply({ command, ...input }: BotReplyInput): Promise<BotReply> {
    return match(command)
      .with('stats', () => this.statsReply(input))
      .with('session', () => this.sessionReply(input))
      .with('marks', () => this.marksReply(input))
      .with('clan', () => this.clanReply(input))
      .with('tank', () => this.tankReply(input))
      .with('top', () => this.topReply(input))
      .exhaustive();
  }

  failure({ locale, error }: FailureInput): BotReply {
    const isNotFound = error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND;

    return this.plain({ locale, key: isNotFound ? 'player-not-found' : 'error-generic' });
  }

  playerText({ locale, card }: PlayerTextInput): string {
    const missing = this.t({ locale, key: 'missing' });

    return this.t({
      locale,
      key: 'player-card',
      vars: {
        nickname: card.nickname,
        clan: card.clanTag ? `[${card.clanTag}]` : '',
        battles: formatNumberOr({ value: card.battles, locale, missing }),
        winRate: formatPercentOr({ value: card.winRate === null ? null : card.winRate / 100, locale, missing }),
        avgDamage: formatNumberOr({ value: card.avgDamage, locale, missing }),
        wn8: formatNumberOr({ value: card.wn8, locale, missing })
      }
    });
  }

  playerBrief({ locale, card }: PlayerTextInput): string {
    const missing = this.t({ locale, key: 'missing' });

    return this.t({
      locale,
      key: 'player-brief',
      vars: {
        wn8: formatNumberOr({ value: card.wn8, locale, missing }),
        winRate: formatPercentOr({ value: card.winRate === null ? null : card.winRate / 100, locale, missing }),
        battles: formatNumberOr({ value: card.battles, locale, missing })
      }
    });
  }

  t({ locale, key, vars }: TranslateInput): string {
    return this.i18n.t(locale, key, vars);
  }

  private async statsReply({ locale, accountId, argument }: CommandReplyInput): Promise<BotReply> {
    const target = argument ? await this.stats.resolve(argument) : accountId;

    if (!target) {
      return this.plain({ locale, key: 'not-linked' });
    }

    const card = await this.stats.player(target);
    const webUrl = this.config.get('WEB_URL');

    return {
      text: this.playerText({ locale, card }),
      link: this.link({ locale, url: playerUrl({ webUrl, nickname: card.nickname }) }),
      imageUrl: statCardUrl({ webUrl, accountId: target })
    };
  }

  private async sessionReply({ locale, accountId }: CommandReplyInput): Promise<BotReply> {
    if (!accountId) {
      return this.plain({ locale, key: 'not-linked' });
    }

    const session = await this.stats.session(accountId);

    if (!session) {
      return this.plain({ locale, key: 'session-none' });
    }

    const missing = this.t({ locale, key: 'missing' });

    return this.plain({
      locale,
      key: 'session-card',
      vars: {
        startedAt: new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: TIME.zone }).format(session.startedAt),
        state: this.t({ locale, key: session.isOpen ? 'session-open' : 'session-closed' }),
        battles: session.battles,
        winRate: formatPercentOr({ value: session.wins / session.battles, locale, missing }),
        avgDamage: formatNumberOr({ value: session.avgDamage, locale, missing }),
        wn8: formatNumberOr({ value: session.wn8, locale, missing })
      }
    });
  }

  private async marksReply({ locale, accountId }: CommandReplyInput): Promise<BotReply> {
    if (!accountId) {
      return this.plain({ locale, key: 'not-linked' });
    }

    const card = await this.stats.marks(accountId);

    if (card.moe1 + card.moe2 + card.moe3 === 0 && card.closest.length === 0) {
      return this.plain({ locale, key: 'marks-none' });
    }

    const lines = card.closest.map((line) =>
      this.t({
        locale,
        key: 'marks-line',
        vars: { tank: line.tankName, percent: formatNumberOr({ value: line.percent, locale, digits: 2, missing: '0' }), marks: line.marks }
      })
    );

    const text = [
      this.t({ locale, key: 'marks-card', vars: { moe3: card.moe3, moe2: card.moe2, moe1: card.moe1 } }),
      ...(lines.length > 0 ? ['', this.t({ locale, key: 'marks-closest' }), ...lines] : [])
    ];

    return { text: text.join('\n'), link: null, imageUrl: null };
  }

  private async clanReply({ locale, accountId }: CommandReplyInput): Promise<BotReply> {
    if (!accountId) {
      return this.plain({ locale, key: 'not-linked' });
    }

    const clan = await this.stats.clan(accountId);

    if (!clan) {
      return this.plain({ locale, key: 'clan-none' });
    }

    return {
      text: this.t({ locale, key: 'clan-card', vars: { tag: clan.tag, name: clan.name, members: clan.membersCount, role: clan.role } }),
      link: this.link({ locale, url: siteUrl({ webUrl: this.config.get('WEB_URL'), path: SITE_LINKS.clan.replace('{tag}', clan.tag) }) }),
      imageUrl: null
    };
  }

  private async tankReply({ locale, argument }: CommandReplyInput): Promise<BotReply> {
    if (!argument) {
      return this.plain({ locale, key: 'tank-usage' });
    }

    const tank = await this.stats.tank(argument);

    if (!tank) {
      return this.plain({ locale, key: 'tank-not-found' });
    }

    const missing = this.t({ locale, key: 'missing' });
    const text = tank.moe
      ? this.t({
          locale,
          key: 'tank-card',
          vars: {
            name: tank.name,
            tier: tank.tier,
            type: tank.type,
            p65: formatNumberOr({ value: tank.moe.p65, locale, missing }),
            p85: formatNumberOr({ value: tank.moe.p85, locale, missing }),
            p95: formatNumberOr({ value: tank.moe.p95, locale, missing })
          }
        })
      : `${tank.name}\n${this.t({ locale, key: 'tank-no-thresholds' })}`;

    return {
      text,
      link: this.link({ locale, url: siteUrl({ webUrl: this.config.get('WEB_URL'), path: SITE_LINKS.tank.replace('{slug}', tank.slug) }) }),
      imageUrl: null
    };
  }

  private async topReply({ locale }: CommandReplyInput): Promise<BotReply> {
    const rows = await this.stats.top();

    if (rows.length === 0) {
      return this.plain({ locale, key: 'top-empty' });
    }

    const lines = rows.map((row, index) =>
      this.t({
        locale,
        key: 'top-line',
        vars: {
          place: index + 1,
          nickname: row.nickname,
          wn8: formatNumberOr({ value: row.wn8, locale, missing: '0' }),
          battles: formatNumberOr({ value: row.battles, locale, missing: '0' })
        }
      })
    );

    return { text: [this.t({ locale, key: 'top-header' }), ...lines].join('\n'), link: null, imageUrl: null };
  }

  private plain(input: TranslateInput): BotReply {
    return { text: this.t(input), link: null, imageUrl: null };
  }

  private link({ locale, url }: LocalizedLinkInput): BotLink | null {
    return isPublicUrl(url) ? { label: this.t({ locale, key: 'open-site' }), url } : null;
  }
}
