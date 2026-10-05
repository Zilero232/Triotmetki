import { twitchChannelParamsSchema, twitchPanelSchema } from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

export class TwitchChannelParamsDto extends createZodDto(twitchChannelParamsSchema) {}
export class TwitchPanelDto extends createZodDto(twitchPanelSchema) {}
