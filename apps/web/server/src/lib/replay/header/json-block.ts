import { ReplayFormatError } from '../errors/replay-format-error';
import { JSON_FIXUPS } from './header.constants';

const decoder = new TextDecoder('utf-8');

export const parseJsonBlock = (bytes: Uint8Array): unknown => {
  const text = decoder.decode(bytes).replace(JSON_FIXUPS.bigIntegerKeys, '"$1":"$2"');

  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(text.replace(JSON_FIXUPS.nonFiniteNumbers, 'null'));
    } catch (error) {
      throw new ReplayFormatError(`JSON block is not valid JSON: ${String(error)}`);
    }
  }
};
