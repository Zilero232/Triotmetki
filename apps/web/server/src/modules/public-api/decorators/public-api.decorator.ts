import { applyDecorators, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiSecurity,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { OPENAPI } from '../../../openapi';
import { PUBLIC_API } from '../config/public-api.constants';
import { V1ApiErrorDto } from '../dto/v1.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiUsageInterceptor } from '../interceptors/api-usage.interceptor';

export const PublicApi = (tag: string) =>
  applyDecorators(
    AllowAnonymous(),
    SkipThrottle(),
    UseGuards(ApiKeyGuard),
    UseInterceptors(ApiUsageInterceptor),
    ApiSecurity(OPENAPI.public.securityName),
    ApiTags(`${PUBLIC_API.tagPrefix}${tag}`),
    ApiBadRequestResponse({ type: V1ApiErrorDto, description: 'VALIDATION_FAILED' }),
    ApiUnauthorizedResponse({ type: V1ApiErrorDto, description: 'API_KEY_INVALID or API_KEY_REVOKED' }),
    ApiNotFoundResponse({ type: V1ApiErrorDto, description: 'PLAYER_NOT_FOUND, CLAN_NOT_FOUND, TANK_NOT_FOUND or NOT_FOUND' }),
    ApiTooManyRequestsResponse({ type: V1ApiErrorDto, description: 'RATE_LIMITED or PLAN_LIMIT_REACHED; see the Retry-After header' })
  );
