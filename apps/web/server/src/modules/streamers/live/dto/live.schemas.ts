import { z } from 'zod';

export const vkTokenSchema = z.object({ access_token: z.string(), expires_in: z.number().catch(3600) });

export const vkChannelsSchema = z.object({
  data: z
    .object({
      channels: z.array(
        z.object({
          channel: z.object({ url: z.string().catch(''), nick: z.string().catch(''), description: z.string().catch('') }).partial(),
          stream: z
            .object({
              status: z.string().catch(''),
              counters: z
                .object({ viewers: z.number().int().catch(0) })
                .partial()
                .catch({})
            })
            .partial()
            .nullish()
        })
      )
    })
    .catch({ channels: [] })
});

export const youtubeLiveSchema = z.object({ items: z.array(z.object({ id: z.object({ videoId: z.string() }) })).catch([]) });

export const youtubeChannelSchema = z.object({ items: z.array(z.object({ snippet: z.object({ description: z.string().catch('') }) })).catch([]) });
