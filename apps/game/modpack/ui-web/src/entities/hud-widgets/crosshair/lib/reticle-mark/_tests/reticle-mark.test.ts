import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { RETICLE_MARKS } from '../../../config';
import { reticleMarkPrimitives, reticleMarkSource } from '../reticle-mark';

const SOURCES = path.resolve(import.meta.dirname, '../../../../../../../../assets/otmetki/crosshair_vector/src');

const isUpdate = process.env.OTMETKI_UPDATE_FIXTURES === '1';

const sourceFiles = () =>
  RETICLE_MARKS.shapeIds.flatMap((shape) => [
    { name: `${shape}.svg`, text: reticleMarkSource({ shape, size: RETICLE_MARKS.sourceSize, outline: false }) },
    { name: `${shape}_o.svg`, text: reticleMarkSource({ shape, size: RETICLE_MARKS.sourceSize, outline: true }) }
  ]);

if (isUpdate) {
  mkdirSync(SOURCES, { recursive: true });
  sourceFiles().forEach((file) => writeFileSync(path.join(SOURCES, file.name), file.text));
}

describe(reticleMarkPrimitives, () => {
  it('draws a thin chevron as one 1 px stroke on pixel centres at 32 px', () => {
    const [chevron] = reticleMarkPrimitives({ shape: 'chevron_thin', size: 32, outline: false });

    expect(chevron).toEqual({ d: 'M9.5 22.5L16.5 16.5L23.5 22.5', paint: 'mark', stroke: 1 });
  });

  it('puts a 2 px stroke on whole pixels', () => {
    const [cross] = reticleMarkPrimitives({ shape: 'cross_gap', size: 32, outline: false });

    expect(cross?.d).toBe('M5 16L12 16');
  });

  it('scales the stroke with the mark size', () => {
    const [chevron] = reticleMarkPrimitives({ shape: 'chevron_thin', size: 64, outline: false });

    expect(chevron?.stroke).toBe(2);
  });

  it('draws the outline 1 px wider on each side under the mark', () => {
    const [outline, mark] = reticleMarkPrimitives({ shape: 'chevron', size: 32, outline: true });

    expect(outline?.paint).toBe('outline');
    expect(outline?.stroke).toBe(4);
    expect(mark?.paint).toBe('mark');
  });

  it('draws every outline before any part of the mark', () => {
    const paints = reticleMarkPrimitives({ shape: 'angles', size: 32, outline: true }).map((primitive) => primitive.paint);

    expect(paints).toEqual(['outline', 'outline', 'outline', 'mark', 'mark', 'mark']);
  });

  it('leaves the dark fill of a filled ring without an outline', () => {
    const paints = reticleMarkPrimitives({ shape: 'ring_filled', size: 32, outline: true }).map((primitive) => primitive.paint);

    expect(paints).toEqual(['outline', 'shade', 'mark']);
  });

  it('centres an odd-sized dot on a pixel centre', () => {
    const [dot] = reticleMarkPrimitives({ shape: 'dot', size: 32, outline: false });

    expect(dot?.d).toBe('M14 16.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0z');
  });
});

describe(reticleMarkSource, () => {
  it.each(sourceFiles())('matches the shipped source $name', ({ name, text }) => {
    const file = path.join(SOURCES, name);

    expect(existsSync(file) && readFileSync(file, 'utf8')).toBe(text);
  });

  it('ships no source for a shape it does not draw', () => {
    const names = sourceFiles().map((file) => file.name);

    expect(readdirSync(SOURCES).sort()).toEqual([...names].sort());
  });
});
