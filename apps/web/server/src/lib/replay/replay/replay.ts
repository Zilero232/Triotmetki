import { isPlainObject } from 'remeda';

import type { ReplayContainer } from '../container/container.types';
import type { ResultsBlock } from '../header/header.types';
import type { ParsedReplay, ReplayInput } from './replay.types';

import { readContainer } from '../container/container';
import { ReplayFormatError } from '../errors/replay-format-error';
import { arenaBlockSchema, resultsBlockSchema } from '../header/header.schemas';
import { parseJsonBlock } from '../header/json-block';
import { buildSummary } from '../summary/summary';

export const toBytes = (input: ReplayInput) => (input instanceof Uint8Array ? input : new Uint8Array(input));

export const parseContainerHeader = (container: ReplayContainer): ParsedReplay => {
  const warnings: string[] = [];
  const [arenaBytes, ...restBytes] = container.blocks;

  if (!arenaBytes) {
    throw new ReplayFormatError('Replay has no JSON blocks');
  }

  const arenaRaw = parseJsonBlock(arenaBytes);

  if (!isPlainObject(arenaRaw)) {
    throw new ReplayFormatError('The first JSON block is not an object');
  }

  const arenaParsed = arenaBlockSchema.safeParse(arenaRaw);

  if (!arenaParsed.success) {
    throw new ReplayFormatError(`The first JSON block has an unexpected shape: ${arenaParsed.error.message}`);
  }

  const extraBlocks: unknown[] = [];
  let results: ResultsBlock | null = null;
  let resultsRaw: unknown = null;

  for (const [index, bytes] of restBytes.entries()) {
    let value: unknown;

    try {
      value = parseJsonBlock(bytes);
    } catch (error) {
      warnings.push(`JSON block #${index + 1} skipped: ${String(error)}`);

      continue;
    }

    if (results === null && Array.isArray(value)) {
      const parsed = resultsBlockSchema.safeParse(value);

      if (parsed.success) {
        results = parsed.data;
        resultsRaw = value;

        continue;
      }

      warnings.push(`JSON block #${index + 1} looks like battle results but failed validation`);
    }

    extraBlocks.push(value);
  }

  const summary = buildSummary({ arena: arenaParsed.data, results });

  return {
    header: {
      arena: arenaRaw,
      blockCount: container.blocks.length,
      extraBlocks,
      results,
      resultsRaw,
      stream: container.stream ? { compressedSize: container.stream.compressedSize, decompressedSize: container.stream.decompressedSize } : null
    },
    summary,
    warnings
  };
};

export const parseReplay = (input: ReplayInput): ParsedReplay => parseContainerHeader(readContainer(toBytes(input)));

export const parseReplaySummary = (input: ReplayInput) => parseReplay(input).summary;
