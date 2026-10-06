import { match, P } from 'ts-pattern';

import { circlePath, pathNumber, polarPoint } from '@/shared/lib/radial';

import type {
  ArcPart,
  DiscPart,
  LinePart,
  PathInput,
  PrimitivesInput,
  ReticleMarkInput,
  ReticlePrimitive,
  RingPart,
  SnapInput,
  StrokedPart,
  StrokeWidthInput
} from './reticle-mark.types';

import { RETICLE_MARKS } from '../../config';

const snap = ({ value, width }: SnapInput): number => (width % 2 === 1 ? Math.floor(value) + 0.5 : Math.round(value));

const strokeWidth = ({ weight, frame }: StrokeWidthInput): number => Math.max(1, Math.round(weight * frame.scale));

const linePath = ({ part, frame, width }: PathInput<LinePart>): string => {
  const at = (offset: number): string => pathNumber(snap({ value: frame.centre + offset * frame.scale, width }));
  const points = part.points.map(([x, y]) => `${at(x)} ${at(y)}`);
  const closed = 'closed' in part && part.closed ? 'z' : '';

  return `M${points.join('L')}${closed}`;
};

const arcPath = ({ part, frame, width }: PathInput<ArcPart>): string => {
  const centre = snap({ value: frame.centre, width });
  const radius = Math.round(part.r * frame.scale);
  const from = polarPoint({ centre, radius, degrees: part.from });
  const to = polarPoint({ centre, radius, degrees: part.to });

  return `M${from}A${radius} ${radius} 0 0 1 ${to}`;
};

const ringPath = ({ part, frame, width }: PathInput<RingPart>): string =>
  circlePath({ centre: snap({ value: frame.centre, width }), radius: Math.round(part.r * frame.scale) });

const strokedPath = (input: PathInput<StrokedPart>): string =>
  match(input)
    .with({ part: { kind: 'line' } }, linePath)
    .with({ part: { kind: 'arc' } }, arcPath)
    .with({ part: { kind: 'ring' } }, ringPath)
    .exhaustive();

const discPrimitives = ({ part, frame, outline }: PrimitivesInput<DiscPart>): ReticlePrimitive[] => {
  const diameter = Math.max(1, Math.round(2 * part.r * frame.scale));
  const centre = snap({ value: frame.centre, width: diameter });
  const radius = diameter / 2;
  const body: ReticlePrimitive = { d: circlePath({ centre, radius }), paint: part.paint, stroke: null };

  if (!outline || part.paint === 'shade') {
    return [body];
  }

  const halo: ReticlePrimitive = { d: circlePath({ centre, radius: radius + RETICLE_MARKS.outlineWidth }), paint: 'outline', stroke: null };

  return [halo, body];
};

const strokedPrimitives = ({ part, frame, outline }: PrimitivesInput<StrokedPart>): ReticlePrimitive[] => {
  const width = strokeWidth({ weight: part.weight, frame });
  const d = strokedPath({ part, frame, width });
  const body: ReticlePrimitive = { d, paint: 'mark', stroke: width };

  if (!outline) {
    return [body];
  }

  const halo: ReticlePrimitive = { d, paint: 'outline', stroke: width + 2 * RETICLE_MARKS.outlineWidth };

  return [halo, body];
};

const partPrimitives = (input: PrimitivesInput): ReticlePrimitive[] =>
  match(input)
    .with({ part: { kind: 'disc' } }, discPrimitives)
    .with({ part: { kind: P.union('line', 'arc', 'ring') } }, strokedPrimitives)
    .exhaustive();

export const reticleMarkPrimitives = ({ shape, size, outline }: ReticleMarkInput): ReticlePrimitive[] => {
  const frame = { centre: size / 2, scale: size / RETICLE_MARKS.grid };
  const drawn = RETICLE_MARKS.shapes[shape].flatMap((part) => partPrimitives({ part, frame, outline }));
  const outlines = drawn.filter((primitive) => primitive.paint === 'outline');
  const bodies = drawn.filter((primitive) => primitive.paint !== 'outline');

  return [...outlines, ...bodies];
};

const sourceAttributes = (primitive: ReticlePrimitive): string => {
  const { paint } = RETICLE_MARKS;
  const colour = primitive.paint === 'mark' ? paint.mark : paint.outline;
  const opacity = { mark: 1, outline: paint.outlineOpacity, shade: paint.shadeOpacity }[primitive.paint];
  const alpha = opacity === 1 ? '' : ` opacity="${opacity}"`;

  if (primitive.stroke === null) {
    return `fill="${colour}"${alpha}`;
  }

  return `fill="none" stroke="${colour}" stroke-width="${primitive.stroke}" stroke-linecap="square" stroke-linejoin="miter"${alpha}`;
};

export const reticleMarkSource = (input: ReticleMarkInput): string => {
  const paths = reticleMarkPrimitives(input).map((primitive) => `  <path d="${primitive.d}" ${sourceAttributes(primitive)}/>`);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${input.size}" height="${input.size}" viewBox="0 0 ${input.size} ${input.size}">`,
    ...paths,
    '</svg>',
    ''
  ].join('\n');
};
