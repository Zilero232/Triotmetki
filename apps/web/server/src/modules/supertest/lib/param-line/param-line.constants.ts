import { RUSSIAN_NUMBER } from '../russian-number/russian-number.constants';

const N = `(${RUSSIAN_NUMBER.source})`;
const VERB = String.raw`(?:был[аио]?\s+)?(?:изменен\p{L}*|измен[её]н\p{L}*|увеличен\p{L}*|уменьшен\p{L}*|снижен\p{L}*|повышен\p{L}*|улучшен\p{L}*|ухудшен\p{L}*|сокращен\p{L}*|ускорен\p{L}*|замедлен\p{L}*)`;
const ARROW = String.raw`(?:→|->|—>|=>|➝|⟶|➔|>)`;

export const PARAM_LINE_PATTERNS = {
  arrowLine: new RegExp(String.raw`^(.+?)\s*[:：—–-]?\s+${N}\s*([^\d→>]*?)\s*${ARROW}\s*${N}\s*(.*)$`, 'u'),
  rangeLine: new RegExp(String.raw`^(.+?)\s*[:：]?\s+(?:${VERB}\s+)?с\s+${N}\s*([^\d]*?)\s+до\s+${N}\s*(.*)$`, 'iu'),
  wasLine: new RegExp(String.raw`^(.+?)\s*[:：]\s*было\s+${N}\s*([^\d,;]*?)\s*[,;]?\s*стало\s+${N}\s*(.*)$`, 'iu'),
  valueLine: new RegExp(String.raw`^([^:：]+?)\s*[:：]\s*${N}\s*([^\d]*)$`, 'u'),
  valueCell: new RegExp(String.raw`^${N}\s*([^\d]*)$`, 'u'),
  trailing: /[\s:：—–-]+$/u,
  maxLabel: 80
} as const;
