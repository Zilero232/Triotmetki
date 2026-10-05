import type { ModProblemReportFile } from '@otmetki/schemas';

import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';
import { MOD_REPORTS } from '@otmetki/schemas';
import { sumBy } from 'remeda';

import type { HashReporterInput } from './report-files.types';

import { hmacSha256Hex } from '../../../../common/lib';
import { MOD_REPORTS_API } from '../../config/mod-reports.constants';

const textBytes = (file: ModProblemReportFile): number => Buffer.byteLength(file.text, 'utf8');

export const fitsReportLimits = (files: readonly ModProblemReportFile[]): boolean =>
  files.every((file) => textBytes(file) <= MOD_REPORTS.maxFileTextBytes) && sumBy(files, textBytes) <= MOD_REPORTS.maxTotalTextBytes;

export const hashReporter = ({ ip, secret }: HashReporterInput): string =>
  hmacSha256Hex({ key: secret, data: `${MOD_REPORTS_API.ipContext}${normalizeIp(ip, DEFAULT_IPV6_SUBNET_PREFIX)}` });
