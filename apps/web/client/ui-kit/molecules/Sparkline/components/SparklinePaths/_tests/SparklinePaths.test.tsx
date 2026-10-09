import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SparklinePaths } from '../SparklinePaths';

type DrawnInput = {
  data: number[];
  withArea?: boolean;
};

const drawn = ({ data, withArea = false }: DrawnInput) =>
  render(
    <svg>
      <SparklinePaths data={data} height={36} width={120} withArea={withArea} />
    </svg>
  ).container;

const pathOf = (container: HTMLElement) => container.querySelector('path')?.getAttribute('d') ?? '';

const heightsOf = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, index) => index % 2 === 1);

describe('SparklinePaths', () => {
  it('draws a finite flat line for an empty series', () => {
    const container = drawn({ data: [] });
    const d = pathOf(container);

    expect(d).not.toBe('');
    expect(d).not.toContain('NaN');
    expect(new Set(heightsOf(d)).size).toBe(1);
  });

  it('draws a finite flat line for a single point', () => {
    const container = drawn({ data: [42] });
    const d = pathOf(container);

    expect(d).not.toContain('NaN');
    expect(new Set(heightsOf(d)).size).toBe(1);
  });

  it('draws a finite line for a constant series', () => {
    const container = drawn({ data: [5, 5, 5] });

    expect(pathOf(container)).not.toContain('NaN');
  });

  it('puts a rising series higher at its end than at its start', () => {
    const container = drawn({ data: [1, 2, 3] });
    const heights = heightsOf(pathOf(container));

    expect(heights.at(-1)).toBeLessThan(heights[0] ?? 0);
  });

  it('adds an area under the line on request', () => {
    const container = drawn({ data: [1, 3, 2], withArea: true });

    expect(container.querySelectorAll('path')).toHaveLength(2);
  });
});
