import { describe, expect, it } from 'vitest';

import { toMessage, toNotificationMessage } from '../messages.mappers';

const message = { title: 'Session summary', body: 'Tanker: 12 battles', url: 'https://triotmetki.ru/p/Tanker?session=1' };

describe('toNotificationMessage', () => {
  it('puts the title, body and link into one embed', () => {
    expect(toNotificationMessage(message).embeds?.[0]).toMatchObject({ title: message.title, description: message.body, url: message.url });
  });

  it('pings nobody, whatever the text contains', () => {
    expect(toNotificationMessage({ ...message, body: '@everyone' }).allowed_mentions).toEqual({ parse: [] });
  });

  it('leaves out a link Discord could not open', () => {
    expect(toNotificationMessage({ ...message, url: 'http://localhost:3000/p/Tanker' }).embeds?.[0]).not.toHaveProperty('url');
  });
});

describe('toMessage', () => {
  it('turns a shared bot reply into content, a public image embed and link buttons', () => {
    const reply = toMessage({
      reply: { text: 'card', link: { label: 'Open', url: 'https://triotmetki.ru/p/a' }, imageUrl: 'https://triotmetki.ru/api/og/player/1' },
      connect: { label: 'Link', url: 'https://triotmetki.ru/me' }
    });

    expect(reply.content).toBe('card');
    expect(reply.embeds).toHaveLength(1);
    expect(reply.components?.[0]).toMatchObject({ components: [{ url: 'https://triotmetki.ru/p/a' }, { url: 'https://triotmetki.ru/me' }] });
  });

  it('drops local images and empty button rows', () => {
    const reply = toMessage({ reply: { text: 'x', link: null, imageUrl: 'http://localhost:3000/og' }, connect: null });

    expect(reply.embeds).toEqual([]);
    expect(reply.components).toEqual([]);
  });
});
