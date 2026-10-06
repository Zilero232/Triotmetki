import parseJson5 from 'json5/lib/parse';

import { ReplayFormatError } from '../errors/replay-format-error';
import { JSON_FIXUPS } from './header.constants';

const decoder = new TextDecoder('utf-8');

const finiteOrNull = (_key: string, value: unknown): unknown => (typeof value === 'number' && !Number.isFinite(value) ? null : value);

export const parseJsonBlock = (bytes: Uint8Array): unknown => {
  const text = decoder.decode(bytes).replace(JSON_FIXUPS.bigIntegerKeys, '"$1":"$2"');

  try {
    return JSON.parse(text);
  } catch {
    try {
      return parseJson5(text, finiteOrNull);
    } catch (error) {
      throw new ReplayFormatError(`JSON block is not valid JSON: ${String(error)}`);
    }
  }
};
