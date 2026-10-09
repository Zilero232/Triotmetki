import { STREAMER_PLATFORMS, STREAMER_PROFILE, streamerPlatformSchema, upsertStreamerProfileSchema } from '@otmetki/schemas';
import * as z from 'zod';

import { PROFILE_FORM } from '../../config';
import { isChannelHost } from './profile-form';

const channelField = z.union([z.literal(''), z.url({ protocol: PROFILE_FORM.linkProtocol })]);

export const profileFormSchema = z.object({
  slug: upsertStreamerProfileSchema.shape.slug,
  displayName: upsertStreamerProfileSchema.shape.displayName,
  bio: z.string().trim().max(STREAMER_PROFILE.bioMaxLength),
  accountId: z.string(),
  channels: z.record(streamerPlatformSchema, channelField).superRefine((channels, context) => {
    for (const platform of STREAMER_PLATFORMS) {
      const url = channels[platform];

      if (url !== '' && !isChannelHost({ platform, url })) {
        context.addIssue({ code: 'custom', path: [platform], message: PROFILE_FORM.hostIssue });
      }
    }
  })
});
