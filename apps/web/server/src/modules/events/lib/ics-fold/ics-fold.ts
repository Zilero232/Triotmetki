import { EVENT_ICS } from '../../config/ics.constants';

const foldLine = (line: string): string => {
  const parts: string[] = [];
  let current = '';
  let size = 0;
  let limit = EVENT_ICS.lineOctets;

  for (const char of line) {
    const octets = Buffer.byteLength(char);

    if (size + octets > limit) {
      parts.push(current);
      current = '';
      size = 0;
      limit = EVENT_ICS.lineOctets - Buffer.byteLength(EVENT_ICS.continuation);
    }

    current += char;
    size += octets;
  }

  parts.push(current);

  return parts.join(`${EVENT_ICS.lineBreak}${EVENT_ICS.continuation}`);
};

export const foldIcsOctets = (ics: string): string =>
  ics
    .replaceAll(/\r\n[ \t]/g, '')
    .split(EVENT_ICS.lineBreak)
    .map(foldLine)
    .join(EVENT_ICS.lineBreak);
