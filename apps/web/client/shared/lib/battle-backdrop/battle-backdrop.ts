import type {
  ContourInput,
  CreateMotesInput,
  CreateTracerInput,
  CrossingInput,
  Mote,
  StepMotesInput,
  Tracer,
  TracerSegment,
  TracerSegmentInput,
  WrapInput
} from './battle-backdrop.types';

import { seededRandom } from '../seeded-random';
import { BATTLE_BACKDROP } from './battle-backdrop.constants';

const smooth = (value: number) => value * value * (3 - 2 * value);

const valueField = ({ seed, cols, rows }: Pick<ContourInput, 'cols' | 'rows' | 'seed'>) => {
  const random = seededRandom(seed);
  const octaves = BATTLE_BACKDROP.octaves.map(({ step, weight }) => {
    const width = Math.ceil(cols / step) + 2;
    const lattice = Array.from({ length: width * (Math.ceil(rows / step) + 2) }, random);

    return { step, weight, width, lattice };
  });

  return (col: number, row: number) =>
    octaves.reduce((sum, { step, weight, width, lattice }) => {
      const x = col / step;
      const y = row / step;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const tx = smooth(x - x0);
      const ty = smooth(y - y0);
      const at = (dx: number, dy: number) => lattice[(y0 + dy) * width + x0 + dx];
      const top = at(0, 0) + (at(1, 0) - at(0, 0)) * tx;
      const bottom = at(0, 1) + (at(1, 1) - at(0, 1)) * tx;

      return sum + (top + (bottom - top) * ty) * weight;
    }, 0);
};

const crossing = ({ a, b, level }: CrossingInput) => (a === b ? 0.5 : (level - a) / (b - a));

export const contourSegments = ({ seed, cols, rows, levels }: ContourInput): number[] => {
  const field = valueField({ seed, cols, rows });
  const values = Array.from({ length: (cols + 1) * (rows + 1) }, (_, index) => field(index % (cols + 1), Math.floor(index / (cols + 1))));
  const segments: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tl = values[row * (cols + 1) + col];
      const tr = values[row * (cols + 1) + col + 1];
      const br = values[(row + 1) * (cols + 1) + col + 1];
      const bl = values[(row + 1) * (cols + 1) + col];

      for (const level of levels) {
        const edges: number[] = [];

        if (tl < level !== tr < level) {
          edges.push(col + crossing({ a: tl, b: tr, level }), row);
        }

        if (tr < level !== br < level) {
          edges.push(col + 1, row + crossing({ a: tr, b: br, level }));
        }

        if (bl < level !== br < level) {
          edges.push(col + crossing({ a: bl, b: br, level }), row + 1);
        }

        if (tl < level !== bl < level) {
          edges.push(col, row + crossing({ a: tl, b: bl, level }));
        }

        for (let point = 0; point + 3 < edges.length; point += 4) {
          segments.push(edges[point] / cols, edges[point + 1] / rows, edges[point + 2] / cols, edges[point + 3] / rows);
        }
      }
    }
  }

  return segments;
};

export const createMotes = ({ seed, dust, smoke }: CreateMotesInput): Mote[] => {
  const random = seededRandom(seed);

  return Array.from({ length: dust + smoke }, (_, index) => {
    const isSmoke = index >= dust;
    const { radius, vx, vy, alpha } = isSmoke ? BATTLE_BACKDROP.mote.smoke : BATTLE_BACKDROP.mote.dust;
    const between = ([base, spread]: readonly [number, number]) => base + random() * spread;

    return {
      x: random(),
      y: random(),
      radius: between(radius),
      vx: between(vx),
      vy: -between(vy),
      alpha: between(alpha),
      isSmoke
    };
  });
};

const wrap = ({ value, margin }: WrapInput) => {
  if (value > 1 + margin) {
    return -margin;
  }

  if (value < -margin) {
    return 1 + margin;
  }

  return value;
};

export const stepMotes = ({ motes, seconds }: StepMotesInput) => {
  for (const mote of motes) {
    const margin = mote.radius * 2;

    mote.x = wrap({ value: mote.x + mote.vx * seconds, margin });
    mote.y = wrap({ value: mote.y + mote.vy * seconds, margin });
  }
};

export const createTracer = ({ random, now, life }: CreateTracerInput): Tracer => {
  const { leftChance, startY: startRange, drift, overshoot, tail } = BATTLE_BACKDROP.tracer;
  const fromLeft = random() < leftChance;
  const startY = startRange[0] + random() * startRange[1];
  const endY = startY + (random() - 0.5) * drift;
  const near = -overshoot;
  const far = 1 + overshoot;

  return {
    from: fromLeft ? [near, startY] : [far, startY],
    to: fromLeft ? [far, endY] : [near, endY],
    born: now,
    life,
    tail: tail[0] + random() * tail[1]
  };
};

export const tracerSegment = ({ tracer, now }: TracerSegmentInput): TracerSegment | null => {
  const progress = (now - tracer.born) / tracer.life;

  if (progress < 0 || progress > 1) {
    return null;
  }

  const at = (value: number): readonly [number, number] => {
    const clamped = Math.min(Math.max(value, 0), 1);

    return [tracer.from[0] + (tracer.to[0] - tracer.from[0]) * clamped, tracer.from[1] + (tracer.to[1] - tracer.from[1]) * clamped];
  };

  return { head: at(progress), tail: at(progress - tracer.tail), fade: 1 - progress * progress };
};
