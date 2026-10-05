import { connectUrlSchema, integrationListSchema, updatePredictionsSchema } from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

import { connectProviderSchema, oauthCallbackSchema } from './integrations.schemas';

export class IntegrationListDto extends createZodDto(integrationListSchema) {}
export class UpdatePredictionsDto extends createZodDto(updatePredictionsSchema) {}
export class ConnectProviderDto extends createZodDto(connectProviderSchema) {}
export class ConnectUrlDto extends createZodDto(connectUrlSchema) {}
export class OAuthCallbackDto extends createZodDto(oauthCallbackSchema) {}
