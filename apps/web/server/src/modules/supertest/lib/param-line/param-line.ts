import type { ParamLine, ToChangeInput, ValueCell } from './param-line.types';

import { parsedUnit } from '../param-key/param-key';
import { parseRussianNumber } from '../russian-number/russian-number';
import { PARAM_LINE_PATTERNS } from './param-line.constants';

const cleanLabel = (label: string): string | null => {
  const cleaned = label.replace(PARAM_LINE_PATTERNS.trailing, '').trim();

  return cleaned.length > 0 && cleaned.length <= PARAM_LINE_PATTERNS.maxLabel && /\p{L}/u.test(cleaned) ? cleaned : null;
};

const toChange = ({ found, raw }: ToChangeInput): ParamLine | null => {
  if (!found) {
    return null;
  }

  const [, labelText = '', fromText = '', fromUnit = '', toText = '', toUnit = ''] = found;
  const label = cleanLabel(labelText);
  const from = parseRussianNumber(fromText);
  const to = parseRussianNumber(toText);

  if (label === null || from === null || to === null) {
    return null;
  }

  return { kind: 'change', label, from, to, unit: parsedUnit(toUnit) ?? parsedUnit(fromUnit), raw };
};

export const parseValueCell = (text: string): ValueCell | null => {
  const found = PARAM_LINE_PATTERNS.valueCell.exec(text.trim());
  const value = found ? parseRussianNumber(found[1] ?? '') : null;

  return found && value !== null ? { value, unit: parsedUnit(found[2] ?? '') } : null;
};

export const parseParamLine = (line: string): ParamLine | null => {
  const raw = line.trim();

  if (raw.length === 0) {
    return null;
  }

  const change =
    toChange({ found: PARAM_LINE_PATTERNS.wasLine.exec(raw), raw }) ??
    toChange({ found: PARAM_LINE_PATTERNS.arrowLine.exec(raw), raw }) ??
    toChange({ found: PARAM_LINE_PATTERNS.rangeLine.exec(raw), raw });

  if (change) {
    return change;
  }

  const found = PARAM_LINE_PATTERNS.valueLine.exec(raw);
  const label = found ? cleanLabel(found[1] ?? '') : null;
  const value = found ? parseRussianNumber(found[2] ?? '') : null;

  return found && label !== null && value !== null ? { kind: 'value', label, value, unit: parsedUnit(found[3] ?? ''), raw } : null;
};
