import { activateChallengeSchema, challengeListSchema, createChallengeSchema, streamerChallengeSchema } from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

export class StreamerChallengeDto extends createZodDto(streamerChallengeSchema) {}
export class ChallengeListDto extends createZodDto(challengeListSchema) {}
export class CreateChallengeDto extends createZodDto(createChallengeSchema) {}
export class ActivateChallengeDto extends createZodDto(activateChallengeSchema) {}
