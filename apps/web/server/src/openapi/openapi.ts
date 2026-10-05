import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import type { PublicDocumentInput, SetupDocsInput } from './openapi.types';

import { OPENAPI } from './openapi.constants';
import { repairNullable } from './repair-nullable/repair-nullable';

export const internalDocument = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle(OPENAPI.internal.title)
    .setDescription(OPENAPI.internal.description)
    .setVersion(OPENAPI.version)
    .addBearerAuth()
    .addCookieAuth(OPENAPI.internal.sessionCookie)
    .addApiKey({ type: 'apiKey', in: 'header', name: OPENAPI.public.apiKeyHeader }, OPENAPI.public.securityName)
    .setOpenAPIVersion(OPENAPI.internal.openApiVersion)
    .build();

  return cleanupOpenApiDoc(repairNullable({ document: SwaggerModule.createDocument(app, config), version: OPENAPI.versions.v31 }), {
    version: OPENAPI.versions.v31
  });
};

export const publicDocument = ({ app, include }: PublicDocumentInput): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle(OPENAPI.public.title)
    .setDescription(OPENAPI.public.description)
    .setVersion(OPENAPI.version)
    .addApiKey({ type: 'apiKey', in: 'header', name: OPENAPI.public.apiKeyHeader }, OPENAPI.public.securityName)
    .build();

  return cleanupOpenApiDoc(repairNullable({ document: SwaggerModule.createDocument(app, config, { include }), version: OPENAPI.versions.v30 }));
};

export const setupDocs = ({ app, internal, include }: SetupDocsInput): void => {
  if (internal) {
    SwaggerModule.setup(OPENAPI.internal.path, app, internalDocument(app));
  }

  const document = publicDocument({ app, include });
  const http = app.getHttpAdapter();

  http.get(`/${OPENAPI.public.specPath}`, (_request: unknown, response: unknown) => http.reply(response, document, 200));
  app.use(`/${OPENAPI.public.path}`, apiReference({ url: `/${OPENAPI.public.specPath}`, pageTitle: OPENAPI.public.title }));
};
