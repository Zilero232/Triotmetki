import type { BotReply } from '../../../bot-commands';

import { openButton } from '../keyboard/keyboard';

export const replyOptions = ({ link, imageUrl }: BotReply) => ({
  ...(imageUrl ? { link_preview_options: { url: imageUrl, prefer_large_media: true } } : {}),
  ...(link ? { reply_markup: openButton(link) } : {})
});
