import { describe, expect, it } from 'vitest';

import { markerGeometry } from '..';

const SCREEN = { width: 1000, height: 500 };

describe('markerGeometry', () => {
  it('places the marker at its screen fraction', () => {
    const geometry = markerGeometry({ mark: { i: 0, tone: 'pen', x: 0.5, y: 0.5, tx: 0.4, ty: 0.5 }, screen: SCREEN });

    expect(geometry.x).toBe(500);
  });

  it('draws the line from the tail to the point', () => {
    const geometry = markerGeometry({ mark: { i: 0, tone: 'pen', x: 0.5, y: 0.5, tx: 0.4, ty: 0.5 }, screen: SCREEN });

    expect(geometry.length).toBe(100);
  });

  it('turns the line along the shot', () => {
    const geometry = markerGeometry({ mark: { i: 0, tone: 'pen', x: 0.5, y: 0.6, tx: 0.5, ty: 0.4 }, screen: SCREEN });

    expect(geometry.angle).toBe(90);
  });
});
