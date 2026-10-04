import type { Frame, ReticleMarkInput, ReticleMarkPart, ReticlePaint, ReticlePrimitive } from './reticle-mark.types';

import { RETICLE_MARKS } from '../../config';

const snap = (value: number, width: number): number => (width % 2 === 1 ? Math.floor(value) + 0.5 : Math.round(value));

const num = (value: number): string => String(Math.round(value * 100) / 100);

const strokeWidth = (weight: number, frame: Frame): number => Math.max(1, Math.round(weight * frame.scale));

const circlePath = (cx: number, cy: number, r: number): string =>
  `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0z`;

const linePath = (part: Extract<ReticleMarkPart, { kind: 'line' }>, frame: Frame, width: number): string => {
  const points = part.points.map(
    ([x, y]) => `${num(snap(frame.centre + x * frame.scale, width))} ${num(snap(frame.centre + y * frame.scale, width))}`
  );

  const closed = 'closed' in part && part.closed ? 'z' : '';

  return `M${points.join('L')}${closed}`;
};

const arcPath = (part: Extract<ReticleMarkPart, { kind: 'arc' }>, frame: Frame, width: number): string => {
  const centre = snap(frame.centre, width);
  const radius = Math.round(part.r * frame.scale);
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;

    return `${num(centre + radius * Math.cos(radians))} ${num(centre + radius * Math.sin(radians))}`;
  };

  return `M${point(part.from)}A${radius} ${radius} 0 0 1 ${point(part.to)}`;
};

const strokedPath = (part: Exclude<ReticleMarkPart, { kind: 'disc' }>, frame: Frame, width: number): string => {
  if (part.kind === 'line') {
    return linePath(part, frame, width);
  }

  if (part.kind === 'arc') {
    return arcPath(part, frame, width);
  }

  const centre = snap(frame.centre, width);

  return circlePath(centre, centre, Math.round(part.r * frame.scale));
};

const discPrimitives = (part: Extract<ReticleMarkPart, { kind: 'disc' }>, frame: Frame, outline: boolean): ReticlePrimitive[] => {
  const diameter = Math.max(1, Math.round(2 * part.r * frame.scale));
  const centre = snap(frame.centre, diameter);
  const paint: ReticlePaint = part.paint;
  const body = { d: circlePath(centre, centre, diameter / 2), paint, stroke: null };

  if (!outline || paint === 'shade') {
    return [body];
  }

  return [{ d: circlePath(centre, centre, diameter / 2 + RETICLE_MARKS.outlineWidth), paint: 'outline', stroke: null }, body];
};

const partPrimitives = (part: ReticleMarkPart, frame: Frame, outline: boolean): ReticlePrimitive[] => {
  if (part.kind === 'disc') {
    return discPrimitives(part, frame, outline);
  }

  const width = strokeWidth(part.weight, frame);
  const d = strokedPath(part, frame, width);
  const body: ReticlePrimitive = { d, paint: 'mark', stroke: width };

  return outline ? [{ d, paint: 'outline', stroke: width + 2 * RETICLE_MARKS.outlineWidth }, body] : [body];
};

export const reticleMarkPrimitives = ({ shape, size, outline }: ReticleMarkInput): ReticlePrimitive[] => {
  const frame = { centre: size / 2, scale: size / RETICLE_MARKS.grid };
  const drawn = RETICLE_MARKS.shapes[shape].map((part) => partPrimitives(part, frame, outline));
  const outlines = drawn.flatMap((primitives) => primitives.filter((primitive) => primitive.paint === 'outline'));
  const bodies = drawn.flatMap((primitives) => primitives.filter((primitive) => primitive.paint !== 'outline'));

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
