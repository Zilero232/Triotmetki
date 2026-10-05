import type { Price } from '@otmetki/gamedata';

import { XMLParser } from 'fast-xml-parser';

import type { IdentifiedNode, MergeNodesInput, XmlGetInput, XmlNode, XmlValue } from './xml.types';

import { oneOf } from '../guards/guards';
import { CURRENCIES, XML } from './xml.constants';

const parser = new XMLParser({
  ignoreAttributes: true,
  ignoreDeclaration: true,
  parseTagValue: false,
  trimValues: true,
  textNodeName: XML.text
});

export const isXmlNode = (value: unknown): value is XmlNode => typeof value === 'object' && value !== null && !Array.isArray(value);

const isCurrency = oneOf(CURRENCIES);

export const parseXml = (source: string): XmlNode => {
  const document: unknown = parser.parse(source);
  const root = isXmlNode(document) ? document.root : undefined;

  if (!isXmlNode(root)) {
    throw new Error('XML document has no <root> element');
  }

  return root;
};

const first = (value: XmlValue | undefined): XmlValue | undefined => (Array.isArray(value) ? value[0] : value);

export const list = (value: XmlValue | undefined): XmlValue[] => {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export const nodes = (value: XmlValue | undefined): XmlNode[] => list(value).filter(isXmlNode);

export const node = (value: XmlValue | undefined): XmlNode | undefined => {
  const single = first(value);

  return isXmlNode(single) ? single : undefined;
};

export const get = ({ value, path }: XmlGetInput): XmlValue | undefined => {
  let current = value;

  for (const key of path.split('/')) {
    const container = node(current);

    if (!container) {
      return undefined;
    }

    current = container[key];
  }

  return current;
};

export const text = (value: XmlValue | undefined): string | undefined => {
  const single = first(value);

  if (typeof single === 'string') {
    return single.trim();
  }

  if (isXmlNode(single)) {
    const inner = single[XML.text];

    return typeof inner === 'string' ? inner.trim() : undefined;
  }

  return undefined;
};

export const num = (value: XmlValue | undefined): number | undefined => {
  const raw = text(value);

  if (raw === undefined || raw === '') {
    return undefined;
  }

  const parsed = Number(raw.split(/\s+/)[0]);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const nums = (value: XmlValue | undefined): number[] => {
  const raw = text(value);

  if (!raw) {
    return [];
  }

  return raw
    .split(/\s+/)
    .map(Number)
    .filter((item) => Number.isFinite(item));
};

export const bool = (value: XmlValue | undefined): boolean | undefined => {
  const raw = text(value)?.toLowerCase();

  if (raw === undefined || raw === '') {
    return undefined;
  }

  return raw === 'true' || raw === '1';
};

export const words = (value: XmlValue | undefined): string[] => {
  const raw = text(value);

  return raw ? raw.split(/\s+/).filter(Boolean) : [];
};

export const entries = (value: XmlValue | undefined): [string, XmlValue][] => {
  const container = node(value);

  if (!container) {
    return [];
  }

  return Object.entries(container).filter(([key]) => !XML.ignoredKeyPrefixes.some((prefix) => key.startsWith(prefix)));
};

export const price = (value: XmlValue | undefined): Price | undefined => {
  const amount = num(value);

  if (amount === undefined) {
    return undefined;
  }

  const container = node(value);
  const marker = container ? Object.keys(container).find(isCurrency) : undefined;

  return { amount, currency: marker ?? 'credits' };
};

export const localizationKey = (value: XmlValue | undefined): string | undefined => {
  const raw = text(value);

  return raw ? raw.replace(/^#/, '') : undefined;
};

export const localizationFallback = (value: XmlValue | undefined): string | undefined => {
  const key = localizationKey(value);

  if (!key) {
    return undefined;
  }

  const name = key.split(':').pop() ?? key;

  return name.replace(/^_+/, '').replaceAll('_', ' ').trim();
};

export const scalars = (value: XmlValue | undefined): Record<string, boolean | number | string> => {
  const result: Record<string, boolean | number | string> = {};

  for (const [key, child] of entries(value)) {
    if (isXmlNode(child) && Object.keys(child).some((childKey) => childKey !== XML.text)) {
      continue;
    }

    const raw = text(child);

    if (raw === undefined) {
      continue;
    }

    const numbers = raw.split(/\s+/).map(Number);

    if (raw !== '' && numbers.length === 1 && Number.isFinite(numbers[0])) {
      result[key] = numbers[0];
    } else if (raw.toLowerCase() === 'true' || raw.toLowerCase() === 'false') {
      result[key] = raw.toLowerCase() === 'true';
    } else {
      result[key] = raw;
    }
  }

  return result;
};

export const scriptName = (value: XmlValue | undefined): string | undefined => {
  const raw = text(value);

  return raw ? raw.split(/\s+/)[0] : undefined;
};

export const mergeNodes = ({ base, override }: MergeNodesInput): XmlNode => {
  const merged: XmlNode = {};

  for (const [key, value] of [...Object.entries(base ?? {}), ...Object.entries(override ?? {})]) {
    if (key === XML.text) {
      continue;
    }

    merged[key] = value;
  }

  return merged;
};

export const identifiedNodes = (xml: string): IdentifiedNode[] =>
  entries(parseXml(xml)).flatMap(([name, value]) => {
    const id = isXmlNode(value) ? num(value.id) : undefined;

    return isXmlNode(value) && id !== undefined ? [{ name, id, value }] : [];
  });
