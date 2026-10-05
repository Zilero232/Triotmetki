import { readFileSync } from 'node:fs';
import { keys, values } from 'remeda';
import { describe, expect, it } from 'vitest';

import { CHAT_COPY } from '../../../config/chat.constants';
import { chatText, chatValue } from '../chat-copy';

const messageIds = (locale: keyof typeof CHAT_COPY.files) =>
  readFileSync(CHAT_COPY.files[locale], 'utf8')
    .split(/\r?\n/u)
    .flatMap((line) => /^([a-z][\w-]*)\s*=/u.exec(line)?.[1] ?? []);

describe('chat locales', () => {
  it('define every chat message in every language', () => {
    for (const locale of keys(CHAT_COPY.files)) {
      expect(messageIds(locale)).toEqual(expect.arrayContaining(values(CHAT_COPY.messages)));
    }
  });
});

describe('chatText', () => {
  it('prints the missing mark instead of an absent number', () => {
    const text = chatText({
      locale: 'en',
      message: CHAT_COPY.messages.stat,
      values: { nickname: 'Tanker', wn8: chatValue(null), winRate: chatValue(Number.NaN), battles: chatValue(undefined) }
    });

    expect(text).not.toContain(CHAT_COPY.missing);
    expect(text).not.toMatch(/NaN|null|undefined|\{/u);
  });

  it('formats a present number', () => {
    const text = chatText({
      locale: 'en',
      message: CHAT_COPY.messages.stat,
      values: { nickname: 'Tanker', wn8: chatValue(2012.4), winRate: 55.5, battles: 10 }
    });

    expect(text).toContain(new Intl.NumberFormat('en').format(2012));
  });
});
