import { firstBy } from 'remeda';

import type { NamedVehicle } from '../../../shop';
import type { ParamLine } from '../param-line/param-line.types';
import type {
  HeadingInput,
  NormaliseInput,
  ParseArticleInput,
  ParsedChange,
  ParsedTank,
  TankHeading,
  VehicleInInput
} from './supertest-article.types';

import { matchTankNames } from '../../../shop';
import { SUPERTEST_ARTICLE, SUPERTEST_SCRAPE } from '../../config/scrape.constants';
import { paramOf } from '../param-key/param-key';
import { parseParamLine, parseValueCell } from '../param-line/param-line';
import { SUPERTEST_ARTICLE_PARAMS } from './supertest-article.constants';

export const isSupertestTitle = (title: string): boolean => SUPERTEST_SCRAPE.titlePattern.test(title);

const clean = (line: string): string => line.replace(SUPERTEST_ARTICLE.bullet, '').replaceAll(/\s+/g, ' ').trim();

const isShort = (line: string): boolean =>
  line.length <= SUPERTEST_ARTICLE.maxHeadingLength && line.split(' ').length <= SUPERTEST_ARTICLE.maxHeadingWords;

const normalise = ({ param, value }: NormaliseInput): number =>
  param !== null && SUPERTEST_ARTICLE_PARAMS.angleParams.has(param) ? Math.abs(value) : value;

const toParsedChange = (entry: ParamLine): ParsedChange => {
  const meta = paramOf(entry.label);
  const param = meta?.key ?? null;
  const unit = meta?.unit ?? entry.unit;

  if (entry.kind === 'value') {
    return { param, label: entry.label, from: null, to: normalise({ param, value: entry.value }), unit, raw: entry.raw };
  }

  return {
    param,
    label: entry.label,
    from: normalise({ param, value: entry.from }),
    to: normalise({ param, value: entry.to }),
    unit,
    raw: entry.raw
  };
};

const paramEntries = (line: string): ParsedChange[] =>
  line
    .split(/;\s*/u)
    .flatMap((piece) => {
      const entry = parseParamLine(piece);

      return entry ? [entry] : [];
    })
    .map(toParsedChange);

const vehicleIn = ({ line, vehicles }: VehicleInInput): NamedVehicle | null => {
  const ids = new Set(matchTankNames({ text: line, vehicles, minLength: SUPERTEST_SCRAPE.minTankNameLength }));

  return (
    firstBy(
      vehicles.filter((vehicle) => ids.has(vehicle.tankId)),
      [(vehicle) => vehicle.name.length, 'desc']
    ) ?? null
  );
};

const looksLikeName = (line: string): boolean =>
  isShort(line) &&
  !SUPERTEST_ARTICLE.sectionHeading.test(line) &&
  !SUPERTEST_ARTICLE_PARAMS.closingPunctuation.test(line) &&
  paramOf(line) === null &&
  /\p{L}/u.test(line);

const startsParams = ({ rows, index }: Pick<HeadingInput, 'index' | 'rows'>): boolean => {
  const next = rows[index + 1] ?? '';

  return parseParamLine(next) !== null || (paramOf(next) !== null && parseValueCell(rows[index + 2] ?? '') !== null);
};

const headingOf = ({ rows, index, vehicles }: HeadingInput): TankHeading | null => {
  const line = rows[index] ?? '';

  if (!isShort(line)) {
    return null;
  }

  const vehicle = vehicleIn({ line, vehicles });

  if (vehicle) {
    return { tankId: vehicle.tankId, name: vehicle.name };
  }

  return looksLikeName(line) && startsParams({ rows, index }) ? { tankId: null, name: line } : null;
};

export const parseSupertestArticle = ({ lines, vehicles }: ParseArticleInput): ParsedTank[] => {
  const rows = lines.map(clean).filter((line) => line.length > 0);
  const tanks = new Map<string, ParsedTank>();
  let current: ParsedTank | null = null;
  let pendingNew = false;

  for (let index = 0; index < rows.length; index += 1) {
    const line = rows[index] ?? '';
    const entries = paramEntries(line);

    if (entries.length > 0) {
      current?.changes.push(...entries);

      continue;
    }

    const heading = headingOf({ rows, index, vehicles });

    if (heading) {
      const key = heading.tankId === null ? heading.name.toLowerCase() : String(heading.tankId);
      const isNew = heading.tankId === null || pendingNew || SUPERTEST_ARTICLE.newVehicleMarker.test(line);
      const existing = tanks.get(key);

      current = existing ?? { ...heading, isNewVehicle: isNew, changes: [] };
      current.isNewVehicle ||= isNew;
      tanks.set(key, current);
      pendingNew = false;

      continue;
    }

    if (SUPERTEST_ARTICLE.newVehicleMarker.test(line)) {
      pendingNew = true;
    }

    const meta = paramOf(line);

    if (!current || !meta) {
      continue;
    }

    const first = isShort(line) ? parseValueCell(rows[index + 1] ?? '') : null;

    if (first) {
      const second = parseValueCell(rows[index + 2] ?? '');
      const unit = meta.unit ?? second?.unit ?? first.unit;
      const raw = [line, rows[index + 1], ...(second ? [rows[index + 2]] : [])].join(' | ');

      current.changes.push(
        second
          ? {
              param: meta.key,
              label: line,
              from: normalise({ param: meta.key, value: first.value }),
              to: normalise({ param: meta.key, value: second.value }),
              unit,
              raw
            }
          : { param: meta.key, label: line, from: null, to: normalise({ param: meta.key, value: first.value }), unit, raw }
      );

      index += second ? 2 : 1;

      continue;
    }

    if (line.length <= SUPERTEST_ARTICLE.maxChangeLineLength && SUPERTEST_ARTICLE_PARAMS.changeVerb.test(line)) {
      current.changes.push({ param: meta.key, label: line, from: null, to: null, unit: meta.unit, raw: line });
    }
  }

  return [...tanks.values()];
};
