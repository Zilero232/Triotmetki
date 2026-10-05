import type { LoggerOptions } from 'pino';

export type PrettyFormat = {
  ignore: string;
  messageFormat: string;
};

export type CreateLoggerInput = {
  service: string;
  pretty?: PrettyFormat;
  level?: string;
};

export type TransportOptions = Pick<LoggerOptions, 'transport'>;
