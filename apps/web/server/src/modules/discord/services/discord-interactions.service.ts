import type { EditInteractionResponseOptions } from '@discordjs/core';
import type { APIInteraction } from 'discord-api-types/v10';

import { API } from '@discordjs/core';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { isChatInputApplicationCommandInteraction } from 'discord-api-types/utils/v10';
import { InteractionType, MessageFlags } from 'discord-api-types/v10';
import { isIncludedIn } from 'remeda';
import { match } from 'ts-pattern';

import type { BotLink, BotLocale, FailureInput } from '../../bot-commands';
import type { CommandContext } from '../discord.types';

import { errorMessage } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { AUTH_PROVIDER } from '../../../lib/auth';
import { BotAccountsReaderService, BotRepliesService, isPublicUrl, resolveBotLocale, SHARED_COMMANDS, SITE_LINKS, siteUrl } from '../../bot-commands';
import { DISCORD_OPTIONS, DISCORD_OWN_COMMANDS } from '../config/commands.constants';
import { DISCORD_TOKENS } from '../config/tokens.constants';
import { stringOption } from '../lib/interaction-options/interaction-options';
import { toMessage } from '../mappers/messages.mappers';
import { DiscordCopyService } from './discord-copy.service';
import { DiscordGuildsWriterService } from './discord-guilds-writer.service';

@Injectable()
export class DiscordInteractionsService {
  private readonly logger = new Logger(DiscordInteractionsService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly accounts: BotAccountsReaderService,
    private readonly replies: BotRepliesService,
    private readonly guilds: DiscordGuildsWriterService,
    private readonly copy: DiscordCopyService,
    @Inject(DISCORD_TOKENS.api) private readonly api: API | null
  ) {}

  async handle(interaction: APIInteraction): Promise<void> {
    if (!this.api || interaction.type !== InteractionType.ApplicationCommand || !isChatInputApplicationCommandInteraction(interaction)) {
      return;
    }

    const discordUserId = interaction.member?.user.id ?? interaction.user?.id;

    if (!discordUserId) {
      return;
    }

    const isPrivate = isIncludedIn(interaction.data.name, DISCORD_OWN_COMMANDS);
    const locale = resolveBotLocale(interaction.locale);

    try {
      await this.api.interactions.defer(interaction.id, interaction.token, isPrivate ? { flags: MessageFlags.Ephemeral } : {});

      const linked = await this.accounts.find({ providerId: AUTH_PROVIDER.discord, externalId: discordUserId, languageHint: interaction.locale });

      if (interaction.guild_id && linked) {
        await this.guilds.recordSeen({ guildId: interaction.guild_id, discordUserId });
      }

      const body = await this.answer({ interaction, locale, linked, discordUserId }).catch((error: unknown) => this.failure({ locale, error }));

      await this.api.interactions.editReply(interaction.application_id, interaction.token, body);
    } catch (error) {
      this.logger.warn(`discord /${interaction.data.name} failed: ${errorMessage(error)}`);
    }
  }

  private async answer(context: CommandContext): Promise<EditInteractionResponseOptions> {
    const { interaction, locale, linked } = context;
    const name = interaction.data.name;
    const options = interaction.data.options;

    if (isIncludedIn(name, SHARED_COMMANDS)) {
      const reply = await this.replies.reply({
        command: name,
        locale,
        accountId: linked?.accountId ?? null,
        argument: stringOption({ options, name: DISCORD_OPTIONS.nickname }) ?? stringOption({ options, name: DISCORD_OPTIONS.name }) ?? ''
      });

      return toMessage({ reply, connect: linked ? null : this.connectLink(locale) });
    }

    const text = await match(name)
      .with('setup', () => this.guilds.setup(context))
      .with('roles', () => this.guilds.syncMe(context))
      .otherwise(() => Promise.resolve(this.copy.t({ locale, key: 'help' })));

    return toMessage({ reply: { text, link: null, imageUrl: null }, connect: linked ? null : this.connectLink(locale) });
  }

  private failure({ locale, error }: FailureInput): EditInteractionResponseOptions {
    if (!(error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND)) {
      this.logger.warn(`discord command failed: ${errorMessage(error)}`);
    }

    return { content: this.replies.failure({ locale, error }).text, embeds: [], components: [] };
  }

  private connectLink(locale: BotLocale): BotLink | null {
    const url = siteUrl({ webUrl: this.config.get('WEB_URL'), path: SITE_LINKS.settings });

    return isPublicUrl(url) ? { label: this.copy.t({ locale, key: 'connect-button' }), url } : null;
  }
}
