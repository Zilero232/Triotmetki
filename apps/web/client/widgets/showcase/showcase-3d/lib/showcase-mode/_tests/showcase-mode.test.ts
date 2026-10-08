import { describe, expect, it } from 'vitest';

import { resolveShowcaseMode } from '../showcase-mode';

const desktop = { hasWebgl: true, isCrawler: false, prefersReducedMotion: false, saveData: false, isCoarsePointer: false, cores: 8, memoryGb: 8 };

describe('resolveShowcaseMode', () => {
  it('runs live on a capable desktop', () => {
    expect(resolveShowcaseMode(desktop)).toBe('live');
  });

  it('shows a crawler the flat render so it never downloads the model', () => {
    expect(resolveShowcaseMode({ ...desktop, isCrawler: true })).toBe('flat');
  });

  it('falls back to the flat render without WebGL or with data saver', () => {
    expect(resolveShowcaseMode({ ...desktop, hasWebgl: false })).toBe('flat');
    expect(resolveShowcaseMode({ ...desktop, saveData: true })).toBe('flat');
  });

  it('draws a still frame when the user prefers reduced motion', () => {
    expect(resolveShowcaseMode({ ...desktop, prefersReducedMotion: true })).toBe('still');
  });

  it('treats a weak touch device as low power', () => {
    expect(resolveShowcaseMode({ ...desktop, isCoarsePointer: true, cores: 4 })).toBe('flat');
    expect(resolveShowcaseMode({ ...desktop, isCoarsePointer: true, cores: 8, memoryGb: 2 })).toBe('flat');
    expect(resolveShowcaseMode({ ...desktop, isCoarsePointer: true, cores: 8, memoryGb: 8 })).toBe('live');
  });

  it('keeps a desktop live even with few cores', () => {
    expect(resolveShowcaseMode({ ...desktop, cores: 2 })).toBe('live');
  });
});
