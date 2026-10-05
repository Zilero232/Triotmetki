import type { MenuFlavor } from '@grammyjs/menu';

import { Menu } from '@grammyjs/menu';
import { Injectable } from '@nestjs/common';

import type { BotContext, MenuLabelInput, SaveSettingsInput, SettingsSnapshot, ToggleChannelInput, ToggleEventInput } from '../telegram.types';

import { PrismaService } from '../../../core';
import { SETTINGS_MENU } from '../config/settings-menu.constants';
import { toggleItem } from '../lib/settings-toggle/settings-toggle';

@Injectable()
export class TelegramSettingsWriterService {
  readonly menu: Menu<BotContext>;

  constructor(private readonly prisma: PrismaService) {
    this.menu = new Menu<BotContext>(SETTINGS_MENU.id).dynamic(async (ctx, range) => {
      const userId = ctx.chat$?.userId;

      if (!userId) {
        return;
      }

      const settings = await this.load(userId);
      const label = ({ isOn, text }: MenuLabelInput) => ctx.t(isOn ? 'settings-on' : 'settings-off', { label: text });

      for (const channel of SETTINGS_MENU.channels) {
        range
          .text(label({ isOn: settings.channels.includes(channel), text: ctx.t(`settings-channel-${channel}`) }), async (button) => {
            await this.toggleChannel({ userId, channel });
            this.refresh(button);
          })
          .row();
      }

      for (const event of SETTINGS_MENU.events) {
        range
          .text(label({ isOn: settings.events.includes(event), text: ctx.t(`settings-event-${event}`) }), async (button) => {
            await this.toggleEvent({ userId, event });
            this.refresh(button);
          })
          .row();
      }

      range.text(label({ isOn: settings.weeklyDigest, text: ctx.t('settings-weekly-digest') }), async (button) => {
        await this.save({ userId, data: { weeklyDigest: !settings.weeklyDigest } });
        this.refresh(button);
      });
    });
  }

  async show(ctx: BotContext): Promise<void> {
    if (!ctx.chat$) {
      await ctx.reply(ctx.t('settings-not-linked'));

      return;
    }

    await ctx.reply(ctx.t('settings-title'), { reply_markup: this.menu });
  }

  async load(userId: string): Promise<SettingsSnapshot> {
    const row = await this.prisma.notificationSettings.findUnique({
      where: { userId },
      select: { channels: true, events: true, weeklyDigest: true }
    });

    return row ?? { channels: [...SETTINGS_MENU.defaultChannels], events: [...SETTINGS_MENU.defaultEvents], weeklyDigest: false };
  }

  async toggleChannel({ userId, channel }: ToggleChannelInput): Promise<void> {
    const { channels } = await this.load(userId);

    await this.save({ userId, data: { channels: toggleItem({ list: channels, item: channel }) } });
  }

  async toggleEvent({ userId, event }: ToggleEventInput): Promise<void> {
    const { events } = await this.load(userId);

    await this.save({ userId, data: { events: toggleItem({ list: events, item: event }) } });
  }

  private async save({ userId, data }: SaveSettingsInput) {
    await this.prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, channels: [...SETTINGS_MENU.defaultChannels], events: [...SETTINGS_MENU.defaultEvents], ...data },
      update: data
    });
  }

  private refresh(ctx: BotContext & MenuFlavor): void {
    ctx.menu.update();
  }
}
