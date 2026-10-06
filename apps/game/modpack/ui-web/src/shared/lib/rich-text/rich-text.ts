import type {
  ApplyTagInput,
  ImageRunInput,
  OpenTag,
  PushTextInput,
  RichImageRun,
  RichLine,
  RichLines,
  RichStyle,
  TagStyleInput
} from './rich-text.types';

import { RICH_TEXT } from './rich-text.constants';

const ENTITIES = new Map<string, string>(Object.entries(RICH_TEXT.entities));
const STYLE_TAGS = new Map<string, RichStyle>(Object.entries(RICH_TEXT.styleTags));
const LINE_BREAK_TAGS = new Set<string>(RICH_TEXT.lineBreakTags);

const isScalarValue = (code: number): boolean =>
  Number.isSafeInteger(code) &&
  code >= 0 &&
  code <= RICH_TEXT.maxCodePoint &&
  (code < RICH_TEXT.surrogates.first || code > RICH_TEXT.surrogates.last);

const fromCodePoint = (code: number): string => String.fromCodePoint(isScalarValue(code) ? code : RICH_TEXT.replacementCodePoint);

const decodeEntities = (text: string): string =>
  text.replace(RICH_TEXT.entity, (whole, name: string) => {
    const lower = name.toLowerCase();

    if (lower.startsWith('#x')) {
      return fromCodePoint(Number.parseInt(lower.slice(2), 16));
    }

    if (lower.startsWith('#')) {
      return fromCodePoint(Number.parseInt(lower.slice(1), 10));
    }

    return ENTITIES.get(lower) ?? whole;
  });

const attributesOf = (source: string): Record<string, string> => {
  const found: Record<string, string> = {};

  for (const match of source.matchAll(RICH_TEXT.attribute)) {
    const [, name = '', double, single] = match;

    found[name.toLowerCase()] = decodeEntities(double ?? single ?? '');
  }

  return found;
};

const positive = (value: string | undefined): number | undefined => {
  const number = Number(value);

  return value !== undefined && Number.isFinite(number) && number > 0 ? number : undefined;
};

const fontStyle = (attributes: Record<string, string>): RichStyle => {
  const style: RichStyle = {};
  const size = positive(attributes.size);

  if (attributes.color !== undefined && RICH_TEXT.color.test(attributes.color)) {
    style.color = attributes.color.toUpperCase();
  }

  if (size !== undefined) {
    style.size = size;
  }

  return style;
};

const tagStyle = ({ tag, attributes }: TagStyleInput): RichStyle | null => (tag === 'font' ? fontStyle(attributes) : (STYLE_TAGS.get(tag) ?? null));

const imageRun = ({ attributes, key }: ImageRunInput): RichImageRun | null => {
  const { src } = attributes;

  if (!src?.startsWith(RICH_TEXT.imageScheme)) {
    return null;
  }

  return { key, kind: 'image', src, width: positive(attributes.width), height: positive(attributes.height) };
};

const createLines = (): RichLines => {
  const lines: RichLine[] = [{ key: '0', runs: [] }];
  const open: OpenTag[] = [];
  const current = (): RichStyle => open.reduce<RichStyle>((merged, { style }) => ({ ...merged, ...style }), {});
  const lastRuns = (): RichLine['runs'] => lines[lines.length - 1]?.runs ?? [];
  const breakLine = (key: string): void => {
    lines.push({ key, runs: [] });
  };

  const pushText = ({ raw, start }: PushTextInput): void => {
    decodeEntities(raw)
      .split(RICH_TEXT.newline)
      .forEach((part, index) => {
        const key = `${start}.${index}`;

        if (index > 0) {
          breakLine(key);
        }

        if (part) {
          lastRuns().push({ key, kind: 'text', text: part, style: current() });
        }
      });
  };

  const close = (tag: string): void => {
    const index = open.map((item) => item.tag).lastIndexOf(tag);

    if (index !== -1) {
      open.splice(index);
    }
  };

  return {
    lines,
    pushText,
    breakLine,
    pushRun: (run) => {
      lastRuns().push(run);
    },
    open: (tag) => {
      open.push(tag);
    },
    close
  };
};

const applyTag = ({ lines, match }: ApplyTagInput): void => {
  const [whole, closing, name = '', rawAttributes = ''] = match;
  const tag = name.toLowerCase();
  const attributes = attributesOf(rawAttributes);

  if (LINE_BREAK_TAGS.has(tag)) {
    lines.breakLine(String(match.index + whole.length));

    return;
  }

  const image = !closing && tag === 'img' ? imageRun({ attributes, key: String(match.index) }) : null;

  if (image) {
    lines.pushRun(image);

    return;
  }

  if (closing) {
    lines.close(tag);

    return;
  }

  const style = tagStyle({ tag, attributes });

  if (style) {
    lines.open({ tag, style });
  }
};

export const parseRichText = (html: string): RichLine[] => {
  const lines = createLines();
  let last = 0;

  for (const match of html.matchAll(RICH_TEXT.tag)) {
    lines.pushText({ raw: html.slice(last, match.index), start: last });
    applyTag({ lines, match });
    last = match.index + match[0].length;
  }

  lines.pushText({ raw: html.slice(last), start: last });

  return lines.lines;
};
